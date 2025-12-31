import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TableTranslation } from './entities/table-translation.entity';
import { AiProvider } from '../ai-admin/entities/ai-provider.entity';
import { SchemaService } from './schema.service';
import { translateTableName, translateColumnName, needsAiTranslation } from '../ai/column-translator';

// ===== Type Definitions =====
interface TranslationResult {
    tableName: string;
    koreanName: string;
    columnsTranslated: number;
    isAiGenerated: boolean;
}

interface BatchTranslationResult {
    translated: number;
    skipped: number;
    failed: number;
    duration: number;
}

interface TranslationProgress {
    connectionId: string;
    current: number;
    total: number;
    tableName: string;
    status: 'processing' | 'completed' | 'failed';
}

interface TranslationOptions {
    forceRetranslate?: boolean;
    useAi?: boolean;
    batchSize?: number;
    maxConcurrency?: number;
    timeout?: number;
}

interface TranslationStats {
    totalTranslations: number;
    aiTranslations: number;
    dictionaryTranslations: number;
    averageTime: number;
    lastUpdated: Date;
}

// ===== Constants =====
const DEFAULT_OPTIONS: Required<TranslationOptions> = {
    forceRetranslate: true,
    useAi: true,
    batchSize: 10,
    maxConcurrency: 3,
    timeout: 60000,
};

const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
};

@Injectable()
export class TableTranslationService implements OnModuleInit {
    private readonly logger = new Logger(TableTranslationService.name);
    private aiClient: OpenAI | null = null;
    private aiModel: string = 'llama2';
    private isInitialized: boolean = false;
    
    // 캐시
    private translationCache: Map<string, { data: Record<string, TableTranslation>; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5분
    
    // 통계
    private stats: TranslationStats = {
        totalTranslations: 0,
        aiTranslations: 0,
        dictionaryTranslations: 0,
        averageTime: 0,
        lastUpdated: new Date(),
    };
    private translationTimes: number[] = [];

    constructor(
        @InjectRepository(TableTranslation)
        private translationRepo: Repository<TableTranslation>,
        @InjectRepository(AiProvider)
        private providerRepo: Repository<AiProvider>,
        private schemaService: SchemaService,
        private eventEmitter?: EventEmitter2,
    ) {}

    async onModuleInit() {
        await this.initializeAiClient();
    }

    /**
     * AI 클라이언트 초기화 (개선된 재시도 로직)
     */
    async initializeAiClient(): Promise<boolean> {
        try {
            const providers = await this.providerRepo.find({
                where: { isActive: true },
                order: { priority: 'ASC' },
                relations: ['models'],
            });

            if (providers.length === 0) {
                this.logger.warn('No active AI providers found');
                this.isInitialized = false;
                return false;
            }

            const provider = providers[0];
            let baseURL = provider.endpoint;
            
            // Normalize endpoint for Ollama and vLLM (OpenAI compatible APIs)
            if ((provider.type === 'ollama' || provider.type === 'vllm') && !baseURL.includes('/v1')) {
                baseURL = baseURL.replace(/\/$/, '') + '/v1';
            }

            this.aiClient = new OpenAI({
                apiKey: provider.apiKey || 'dummy-key',
                baseURL,
                timeout: 300000,
                maxRetries: 2,
            });

            if (provider.models && provider.models.length > 0) {
                this.aiModel = provider.models[0].modelId;
            }

            this.isInitialized = true;
            this.logger.log(`✅ AI client initialized: ${provider.name} (${this.aiModel})`);
            return true;
        } catch (error) {
            this.logger.error('❌ Failed to initialize AI client', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * AI 클라이언트 재초기화
     */
    async reinitializeAiClient(): Promise<boolean> {
        this.aiClient = null;
        this.isInitialized = false;
        return this.initializeAiClient();
    }

    /**
     * 서비스 상태 조회
     */
    getStatus(): { isReady: boolean; aiEnabled: boolean; model: string; stats: TranslationStats } {
        return {
            isReady: this.isInitialized,
            aiEnabled: !!this.aiClient,
            model: this.aiModel,
            stats: { ...this.stats },
        };
    }

    /**
     * 캐시된 번역 맵 조회 (TTL 적용)
     */
    private async getCachedTranslationsMap(connectionId: string, forceRefresh = false): Promise<Record<string, TableTranslation>> {
        const cacheKey = connectionId;
        const cached = this.translationCache.get(cacheKey);
        const now = Date.now();

        if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_TTL) {
            return cached.data;
        }

        const map = await this.getTranslationsMap(connectionId);
        this.translationCache.set(cacheKey, { data: map, timestamp: now });
        return map;
    }

    /**
     * 캐시 무효화
     */
    invalidateCache(connectionId?: string) {
        if (connectionId) {
            this.translationCache.delete(connectionId);
        } else {
            this.translationCache.clear();
        }
    }

    /**
     * 연결의 모든 테이블 번역 조회
     */
    async getTranslations(connectionId: string): Promise<TableTranslation[]> {
        return this.translationRepo.find({ where: { connectionId } });
    }

    /**
     * 테이블 번역 조회 (Map 형태)
     */
    async getTranslationsMap(connectionId: string): Promise<Record<string, TableTranslation>> {
        const translations = await this.getTranslations(connectionId);
        const map: Record<string, TableTranslation> = {};
        for (const t of translations) {
            map[t.tableName] = t;
        }
        return map;
    }

    /**
     * AI로 테이블 번역 생성 및 저장 (개선된 배치 처리)
     */
    async translateAndSave(
        connectionId: string, 
        options: TranslationOptions = {}
    ): Promise<BatchTranslationResult> {
        const startTime = Date.now();
        const opts = { ...DEFAULT_OPTIONS, ...options };
        
        // 1. 테이블 목록 가져오기
        const tables = await this.schemaService.getTables(connectionId);
        
        // 2. 기존 번역 조회
        const existingMap = await this.getCachedTranslationsMap(connectionId, true);
        
        let translated = 0;
        let skipped = 0;
        let failed = 0;

        // 3. 번역할 테이블 필터링
        const tablesToTranslate = opts.forceRetranslate 
            ? tables 
            : tables.filter(t => !existingMap[t.name]);

        if (tablesToTranslate.length === 0) {
            return { translated: 0, skipped: tables.length, failed: 0, duration: 0 };
        }

        // 4. 진행 상황 이벤트 발송
        this.emitProgress(connectionId, 0, tablesToTranslate.length, '', 'processing');

        // 5. AI 번역 시도 (개선된 배치 처리)
        let aiTranslations: Record<string, string> = {};
        
        if (opts.useAi && this.aiClient) {
            const tableNames = tablesToTranslate.map(t => t.name);
            aiTranslations = await this.translateTablesInBatches(tableNames, opts.batchSize);
        } else {
            // AI 비활성화 시 사전 번역
            for (const table of tablesToTranslate) {
                aiTranslations[table.name] = translateTableName(table.name);
            }
        }
        
        // 6. 번역 결과 저장 (병렬 처리)
        const savePromises: Promise<void>[] = [];
        
        for (let i = 0; i < tablesToTranslate.length; i++) {
            const table = tablesToTranslate[i];
            
            const savePromise = (async () => {
                try {
                    const koreanName = aiTranslations[table.name] || translateTableName(table.name);
                    
                    // 컬럼 번역
                    const columns = await this.schemaService.getColumns(connectionId, table.name);
                    const columnTranslations: Record<string, string> = {};
                    for (const col of columns) {
                        columnTranslations[col.name] = translateColumnName(col.name, col.comment);
                    }

                    // 저장
                    const isAiGenerated = aiTranslations[table.name] !== translateTableName(table.name);
                    await this.saveTranslation(connectionId, table.name, koreanName, columnTranslations, isAiGenerated, existingMap);
                    
                    translated++;
                    this.updateStats(isAiGenerated, Date.now() - startTime);
                    
                    // 진행 상황 업데이트
                    this.emitProgress(connectionId, i + 1, tablesToTranslate.length, table.name, 'processing');
                } catch (error) {
                    this.logger.error(`Failed to save translation for ${table.name}`, error);
                    failed++;
                }
            })();
            
            savePromises.push(savePromise);
            
            // 동시성 제한
            if (savePromises.length >= opts.maxConcurrency) {
                await Promise.all(savePromises);
                savePromises.length = 0;
            }
        }
        
        // 남은 작업 완료
        if (savePromises.length > 0) {
            await Promise.all(savePromises);
        }
        
        // 캐시 무효화
        this.invalidateCache(connectionId);
        
        // 완료 이벤트
        this.emitProgress(connectionId, tablesToTranslate.length, tablesToTranslate.length, '', 'completed');
        
        const duration = Date.now() - startTime;
        this.logger.log(`✅ Translation completed: ${translated} translated, ${failed} failed in ${duration}ms`);
        
        return { translated, skipped, failed, duration };
    }

    /**
     * 배치 단위로 테이블 번역 (개선된 에러 처리)
     */
    private async translateTablesInBatches(
        tableNames: string[], 
        batchSize: number
    ): Promise<Record<string, string>> {
        const result: Record<string, string> = {};
        
        for (let i = 0; i < tableNames.length; i += batchSize) {
            const batch = tableNames.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(tableNames.length / batchSize);
            
            this.logger.log(`🔄 AI 번역 배치 ${batchNum}/${totalBatches}: ${batch.length}개 테이블`);
            
            try {
                const batchTranslations = await this.retryWithBackoff(
                    () => this.translateTablesWithAi(batch),
                    `Batch ${batchNum}`
                );
                Object.assign(result, batchTranslations);
            } catch (batchError) {
                this.logger.warn(`⚠️ 배치 ${batchNum} AI 번역 실패, 사전 번역 사용`, batchError);
                for (const name of batch) {
                    result[name] = translateTableName(name);
                }
            }
        }
        
        return result;
    }

    /**
     * Exponential backoff 재시도 로직
     */
    private async retryWithBackoff<T>(
        fn: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt < RETRY_CONFIG.maxRetries - 1) {
                    const delay = Math.min(
                        RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
                        RETRY_CONFIG.maxDelay
                    );
                    this.logger.warn(`⏳ ${operationName} 재시도 ${attempt + 1}/${RETRY_CONFIG.maxRetries} in ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 단일 테이블의 컬럼을 AI로 번역 (개선된 버전)
     */
    async translateSingleTable(
        connectionId: string, 
        tableName: string,
        options: TranslationOptions = {}
    ): Promise<TranslationResult> {
        const startTime = Date.now();
        const opts = { ...DEFAULT_OPTIONS, ...options };
        
        // 1. 컬럼 목록 가져오기
        const columns = await this.schemaService.getColumns(connectionId, tableName);
        
        // 2. AI로 테이블 및 컬럼 번역
        let tableKoreanName = translateTableName(tableName);
        const columnTranslations: Record<string, string> = {};
        let isAiGenerated = false;
        
        if (opts.useAi && this.aiClient) {
            try {
                const aiResult = await this.retryWithBackoff(
                    () => this.translateSingleTableWithAi(tableName, columns),
                    `Table ${tableName}`
                );
                
                tableKoreanName = aiResult.tableKoreanName;
                Object.assign(columnTranslations, aiResult.columnTranslations);
                isAiGenerated = true;
            } catch (error) {
                this.logger.warn(`⚠️ AI translation failed for ${tableName}, using dictionary`, error);
            }
        }
        
        // 3. 사전 번역으로 폴백
        for (const col of columns) {
            if (!columnTranslations[col.name]) {
                columnTranslations[col.name] = translateColumnName(col.name, col.comment);
            }
        }
        
        // 4. 저장
        const existingMap = await this.getCachedTranslationsMap(connectionId);
        await this.saveTranslation(connectionId, tableName, tableKoreanName, columnTranslations, isAiGenerated, existingMap);
        
        // 캐시 무효화
        this.invalidateCache(connectionId);
        
        // 통계 업데이트
        this.updateStats(isAiGenerated, Date.now() - startTime);
        
        return {
            tableName,
            koreanName: tableKoreanName,
            columnsTranslated: columns.length,
            isAiGenerated,
        };
    }

    /**
     * AI를 사용한 단일 테이블 번역
     */
    private async translateSingleTableWithAi(
        tableName: string, 
        columns: { name: string; comment?: string }[]
    ): Promise<{ tableKoreanName: string; columnTranslations: Record<string, string> }> {
        const terms = [tableName, ...columns.map(c => c.name)];
        const termsList = terms.map(t => `- ${t}`).join('\n');
        
        const prompt = `아래 데이터베이스 용어들을 **반드시 한국어**로 번역해주세요.
첫 번째 항목은 테이블명이고, 나머지는 컬럼명입니다.

규칙:
1. 간결하고 자연스러운 한국어 명사로 번역
2. "영어명: 한글명" 형식으로 응답
3. 한글만 사용 (영어, 중국어, 일본어 사용 금지)
4. 추가 설명 없이 번역만

번역할 용어:
${termsList}`;

        this.logger.log(`🔄 AI translating table ${tableName} and ${columns.length} columns...`);

        const response = await this.aiClient!.chat.completions.create({
            model: this.aiModel,
            messages: [
                {
                    role: 'system',
                    content: '당신은 IT 데이터베이스 전문 번역가입니다. 영어 용어를 간결하고 자연스러운 한국어로 번역합니다. 반드시 한글로만 응답하세요.',
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || '';
        this.logger.debug(`AI response for ${tableName}: ${content.substring(0, 200)}...`);
        
        // 응답 파싱
        let tableKoreanName = translateTableName(tableName);
        const columnTranslations: Record<string, string> = {};
        
        const lines = content.split('\n').filter(l => l.includes(':'));
        for (const line of lines) {
            const match = line.match(/[-•]?\s*(\w+)\s*[:：]\s*(.+)/);
            if (match) {
                const [, englishName, koreanName] = match;
                const cleanKoreanName = koreanName.trim().replace(/["\*`]/g, '');
                
                if (englishName.toLowerCase() === tableName.toLowerCase()) {
                    tableKoreanName = cleanKoreanName;
                } else {
                    const foundCol = columns.find(c => c.name.toLowerCase() === englishName.toLowerCase());
                    if (foundCol) {
                        columnTranslations[foundCol.name] = cleanKoreanName;
                    }
                }
            }
        }

        return { tableKoreanName, columnTranslations };
    }

    /**
     * AI로 테이블명 일괄 번역
     */
    private async translateTablesWithAi(tableNames: string[]): Promise<Record<string, string>> {
        const result: Record<string, string> = {};

        if (!this.aiClient || tableNames.length === 0) {
            return result;
        }

        const tableList = tableNames.map(t => `- ${t}`).join('\n');
        const prompt = `아래 데이터베이스 테이블 이름들을 **반드시 한국어**로 번역해주세요.

규칙:
1. 영어 테이블명을 자연스러운 한국어 명사로 번역
2. "영어명: 한글명" 형식으로 응답
3. 한글만 사용 (영어, 중국어, 일본어 사용 금지)
4. 추가 설명 없이 번역만

예시:
- users: 사용자
- orders: 주문
- products: 상품

번역할 테이블:
${tableList}`;

        this.logger.log(`🔄 AI translating ${tableNames.length} tables...`);

        const response = await this.aiClient.chat.completions.create({
            model: this.aiModel,
            messages: [
                {
                    role: 'system',
                    content: '당신은 IT 데이터베이스 전문 번역가입니다. 영어 테이블명을 간결하고 자연스러운 한국어로 번역합니다. 반드시 한글로만 응답하세요.',
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || '';
        this.logger.debug(`AI response: ${content.substring(0, 200)}...`);
        
        // 응답 파싱
        const lines = content.split('\n').filter(l => l.includes(':'));
        for (const line of lines) {
            const match = line.match(/[-•]?\s*(\w+)\s*[:：]\s*(.+)/);
            if (match) {
                const [, englishName, koreanName] = match;
                const foundTable = tableNames.find(t => 
                    t.toLowerCase() === englishName.toLowerCase()
                );
                if (foundTable) {
                    result[foundTable] = koreanName.trim().replace(/["\*`]/g, '');
                }
            }
        }

        this.logger.log(`✅ AI translated ${Object.keys(result).length}/${tableNames.length} tables`);

        // 사전 번역으로 폴백
        for (const name of tableNames) {
            if (!result[name]) {
                result[name] = translateTableName(name);
            }
        }

        return result;
    }

    /**
     * 모든 테이블의 컬럼을 AI로 번역 (개선된 병렬 처리)
     */
    async translateAllTablesColumns(
        connectionId: string,
        options: TranslationOptions = {}
    ): Promise<{ 
        totalTables: number; 
        translatedTables: number; 
        failedTables: number;
        totalColumns: number;
        duration: number;
    }> {
        const startTime = Date.now();
        const opts = { ...DEFAULT_OPTIONS, ...options };
        
        const tables = await this.schemaService.getTables(connectionId);
        
        if (tables.length === 0) {
            return { totalTables: 0, translatedTables: 0, failedTables: 0, totalColumns: 0, duration: 0 };
        }

        let translatedTables = 0;
        let failedTables = 0;
        let totalColumns = 0;

        // 세마포어 기반 동시성 제어
        const semaphore = new Array(opts.maxConcurrency).fill(Promise.resolve());
        
        const translateTable = async (table: { name: string }, index: number) => {
            try {
                this.logger.log(`🔄 Translating table ${index + 1}/${tables.length}: ${table.name}`);
                this.emitProgress(connectionId, index, tables.length, table.name, 'processing');
                
                const result = await this.translateSingleTable(connectionId, table.name, opts);
                totalColumns += result.columnsTranslated;
                translatedTables++;
            } catch (error) {
                this.logger.error(`❌ Failed to translate table ${table.name}`, error);
                
                // 사전 번역으로 폴백
                try {
                    const fallbackResult = await this.translateSingleTableWithDictionary(connectionId, table.name);
                    totalColumns += fallbackResult.columnsTranslated;
                    translatedTables++;
                } catch (fallbackError) {
                    this.logger.error(`❌ Dictionary fallback also failed for ${table.name}`, fallbackError);
                    failedTables++;
                }
            }
        };

        // 동시성 제한을 적용한 병렬 처리
        for (let i = 0; i < tables.length; i++) {
            const slotIndex = i % opts.maxConcurrency;
            semaphore[slotIndex] = semaphore[slotIndex].then(() => translateTable(tables[i], i));
        }
        
        await Promise.all(semaphore);
        
        // 완료 이벤트
        this.emitProgress(connectionId, tables.length, tables.length, '', 'completed');
        
        const duration = Date.now() - startTime;
        this.logger.log(`✅ All tables translated: ${translatedTables}/${tables.length} in ${duration}ms`);
        
        return { 
            totalTables: tables.length, 
            translatedTables,
            failedTables,
            totalColumns,
            duration,
        };
    }

    /**
     * 번역 저장 (공통 로직)
     */
    private async saveTranslation(
        connectionId: string,
        tableName: string,
        koreanName: string,
        columnTranslations: Record<string, string>,
        isAiGenerated: boolean,
        existingMap: Record<string, TableTranslation>
    ): Promise<void> {
        const existing = existingMap[tableName];
        
        if (existing) {
            existing.koreanName = koreanName;
            existing.columnTranslations = columnTranslations;
            existing.isAiGenerated = isAiGenerated;
            await this.translationRepo.save(existing);
        } else {
            await this.translationRepo.save({
                connectionId,
                tableName,
                koreanName,
                columnTranslations,
                isAiGenerated,
            });
        }
    }

    /**
     * 수동 번역 업데이트
     */
    async updateTranslation(
        connectionId: string, 
        tableName: string, 
        koreanName: string,
        koreanDescription?: string
    ): Promise<TableTranslation> {
        let translation = await this.translationRepo.findOne({
            where: { connectionId, tableName }
        });

        if (translation) {
            translation.koreanName = koreanName;
            if (koreanDescription !== undefined) {
                translation.koreanDescription = koreanDescription;
            }
            translation.isAiGenerated = false;
        } else {
            translation = this.translationRepo.create({
                connectionId,
                tableName,
                koreanName,
                koreanDescription,
                isAiGenerated: false,
            });
        }

        const saved = await this.translationRepo.save(translation);
        this.invalidateCache(connectionId);
        
        return saved;
    }

    /**
     * 사전 번역만 사용하여 단일 테이블 번역 (AI 폴백용)
     */
    async translateSingleTableWithDictionary(connectionId: string, tableName: string): Promise<TranslationResult> {
        const columns = await this.schemaService.getColumns(connectionId, tableName);
        
        const tableKoreanName = translateTableName(tableName);
        const columnTranslations: Record<string, string> = {};
        
        for (const col of columns) {
            columnTranslations[col.name] = translateColumnName(col.name, col.comment);
        }
        
        const existingMap = await this.getCachedTranslationsMap(connectionId);
        await this.saveTranslation(connectionId, tableName, tableKoreanName, columnTranslations, false, existingMap);
        
        this.invalidateCache(connectionId);
        this.updateStats(false, 0);
        
        return {
            tableName,
            koreanName: tableKoreanName,
            columnsTranslated: columns.length,
            isAiGenerated: false,
        };
    }

    /**
     * 개별 컬럼 번역 수동 업데이트
     */
    async updateColumnTranslation(
        connectionId: string,
        tableName: string,
        columnName: string,
        koreanName: string
    ): Promise<{ tableName: string; columnName: string; koreanName: string }> {
        let translation = await this.translationRepo.findOne({
            where: { connectionId, tableName }
        });

        if (translation) {
            if (!translation.columnTranslations) {
                translation.columnTranslations = {};
            }
            translation.columnTranslations[columnName] = koreanName;
            translation.isAiGenerated = false;
            await this.translationRepo.save(translation);
        } else {
            translation = this.translationRepo.create({
                connectionId,
                tableName,
                koreanName: translateTableName(tableName),
                columnTranslations: { [columnName]: koreanName },
                isAiGenerated: false,
            });
            await this.translationRepo.save(translation);
        }

        this.invalidateCache(connectionId);
        
        return { tableName, columnName, koreanName };
    }

    /**
     * 여러 컬럼 번역 일괄 업데이트
     */
    async updateMultipleColumnTranslations(
        connectionId: string,
        tableName: string,
        translations: Record<string, string>
    ): Promise<{ tableName: string; updatedColumns: number }> {
        let translation = await this.translationRepo.findOne({
            where: { connectionId, tableName }
        });

        if (translation) {
            translation.columnTranslations = {
                ...translation.columnTranslations,
                ...translations,
            };
            translation.isAiGenerated = false;
        } else {
            translation = this.translationRepo.create({
                connectionId,
                tableName,
                koreanName: translateTableName(tableName),
                columnTranslations: translations,
                isAiGenerated: false,
            });
        }

        await this.translationRepo.save(translation);
        this.invalidateCache(connectionId);

        return { tableName, updatedColumns: Object.keys(translations).length };
    }

    /**
     * 번역 삭제
     */
    async deleteTranslation(connectionId: string, tableName: string): Promise<boolean> {
        const result = await this.translationRepo.delete({ connectionId, tableName });
        this.invalidateCache(connectionId);
        return (result.affected ?? 0) > 0;
    }

    /**
     * 연결의 모든 번역 삭제
     */
    async deleteAllTranslations(connectionId: string): Promise<number> {
        const result = await this.translationRepo.delete({ connectionId });
        this.invalidateCache(connectionId);
        return result.affected ?? 0;
    }

    /**
     * 번역 통계 업데이트
     */
    private updateStats(isAiGenerated: boolean, duration: number) {
        this.stats.totalTranslations++;
        if (isAiGenerated) {
            this.stats.aiTranslations++;
        } else {
            this.stats.dictionaryTranslations++;
        }
        
        if (duration > 0) {
            this.translationTimes.push(duration);
            // 최근 100개만 유지
            if (this.translationTimes.length > 100) {
                this.translationTimes.shift();
            }
            this.stats.averageTime = this.translationTimes.reduce((a, b) => a + b, 0) / this.translationTimes.length;
        }
        
        this.stats.lastUpdated = new Date();
    }

    /**
     * 진행 상황 이벤트 발송
     */
    private emitProgress(connectionId: string, current: number, total: number, tableName: string, status: TranslationProgress['status']) {
        if (this.eventEmitter) {
            const progress: TranslationProgress = {
                connectionId,
                current,
                total,
                tableName,
                status,
            };
            this.eventEmitter.emit('translation.progress', progress);
        }
    }

    /**
     * 번역 내보내기 (JSON)
     */
    async exportTranslations(connectionId: string): Promise<{
        connectionId: string;
        exportedAt: string;
        translations: TableTranslation[];
    }> {
        const translations = await this.getTranslations(connectionId);
        return {
            connectionId,
            exportedAt: new Date().toISOString(),
            translations,
        };
    }

    /**
     * 번역 가져오기 (JSON)
     */
    async importTranslations(
        connectionId: string,
        data: { tableName: string; koreanName: string; columnTranslations?: Record<string, string> }[]
    ): Promise<{ imported: number; updated: number }> {
        const existingMap = await this.getTranslationsMap(connectionId);
        let imported = 0;
        let updated = 0;

        for (const item of data) {
            const existing = existingMap[item.tableName];
            
            if (existing) {
                existing.koreanName = item.koreanName;
                if (item.columnTranslations) {
                    existing.columnTranslations = {
                        ...existing.columnTranslations,
                        ...item.columnTranslations,
                    };
                }
                existing.isAiGenerated = false;
                await this.translationRepo.save(existing);
                updated++;
            } else {
                await this.translationRepo.save({
                    connectionId,
                    tableName: item.tableName,
                    koreanName: item.koreanName,
                    columnTranslations: item.columnTranslations || {},
                    isAiGenerated: false,
                });
                imported++;
            }
        }

        this.invalidateCache(connectionId);
        
        return { imported, updated };
    }
}
