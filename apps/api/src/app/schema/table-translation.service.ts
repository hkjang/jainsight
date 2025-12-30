import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { TableTranslation } from './entities/table-translation.entity';
import { AiProvider } from '../ai-admin/entities/ai-provider.entity';
import { SchemaService } from './schema.service';
import { translateTableName, translateColumnName, needsAiTranslation } from '../ai/column-translator';

@Injectable()
export class TableTranslationService {
    private readonly logger = new Logger(TableTranslationService.name);
    private aiClient: OpenAI | null = null;
    private aiModel: string = 'llama2';

    constructor(
        @InjectRepository(TableTranslation)
        private translationRepo: Repository<TableTranslation>,
        @InjectRepository(AiProvider)
        private providerRepo: Repository<AiProvider>,
        private schemaService: SchemaService,
    ) {
        this.initializeAiClient();
    }

    /**
     * AI 클라이언트 초기화
     */
    private async initializeAiClient() {
        try {
            const providers = await this.providerRepo.find({
                where: { isActive: true },
                order: { priority: 'ASC' },
                relations: ['models'],
            });

            if (providers.length === 0) {
                this.logger.warn('No active AI providers found');
                return;
            }

            const provider = providers[0];
            let baseURL = provider.endpoint;
            
            if (provider.type === 'ollama' && !baseURL.includes('/v1')) {
                baseURL = baseURL.replace(/\/$/, '') + '/v1';
            }

            this.aiClient = new OpenAI({
                apiKey: provider.apiKey || 'ollama',
                baseURL,
                timeout: 300000, // 5 minute timeout for AI translation
                maxRetries: 1,
            });

            if (provider.models && provider.models.length > 0) {
                this.aiModel = provider.models[0].modelId;
            }

            this.logger.log(`AI client initialized: ${provider.name} (${this.aiModel})`);
        } catch (error) {
            this.logger.error('Failed to initialize AI client', error);
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
     * AI로 테이블 번역 생성 및 저장 (항상 재번역)
     */
    async translateAndSave(connectionId: string): Promise<{ translated: number; skipped: number }> {
        // 1. 테이블 목록 가져오기
        const tables = await this.schemaService.getTables(connectionId);
        
        // 2. 기존 번역 조회
        const existingMap = await this.getTranslationsMap(connectionId);
        
        let translated = 0;
        const skipped = 0; // 이제 스킵하지 않음

        // 3. 모든 테이블 번역 (기존 번역 있어도 재번역)
        const tablesToTranslate = tables;

        if (tablesToTranslate.length === 0) {
            return { translated: 0, skipped };
        }

        // 4. AI 번역 시도 (배치 처리 + 에러 핸들링)
        let aiTranslations: Record<string, string> = {};
        
        if (this.aiClient) {
            try {
                // 10개씩 배치로 나누어 AI 번역
                const batchSize = 10;
                const tableNames = tablesToTranslate.map(t => t.name);
                
                for (let i = 0; i < tableNames.length; i += batchSize) {
                    const batch = tableNames.slice(i, i + batchSize);
                    this.logger.log(`AI 번역 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(tableNames.length / batchSize)}: ${batch.length}개 테이블`);
                    
                    try {
                        const batchTranslations = await this.translateTablesWithAi(batch);
                        aiTranslations = { ...aiTranslations, ...batchTranslations };
                    } catch (batchError) {
                        this.logger.warn(`배치 ${Math.floor(i / batchSize) + 1} AI 번역 실패, 사전 번역 사용`, batchError);
                        // 배치 실패 시 사전 번역으로 폴백
                        for (const name of batch) {
                            aiTranslations[name] = translateTableName(name);
                        }
                    }
                }
            } catch (error) {
                this.logger.error('AI 번역 전체 실패, 사전 번역으로 폴백', error);
                // 전체 실패 시 모두 사전 번역 사용
                for (const table of tablesToTranslate) {
                    aiTranslations[table.name] = translateTableName(table.name);
                }
            }
        } else {
            // AI 클라이언트 없으면 사전 번역
            for (const table of tablesToTranslate) {
                aiTranslations[table.name] = translateTableName(table.name);
            }
        }
        
        // 5. 번역 결과 저장
        for (const table of tablesToTranslate) {
            const koreanName = aiTranslations[table.name] || translateTableName(table.name);
            
            // 컬럼 번역도 수행
            const columns = await this.schemaService.getColumns(connectionId, table.name);
            const columnTranslations: Record<string, string> = {};
            for (const col of columns) {
                columnTranslations[col.name] = translateColumnName(col.name, col.comment);
            }

            // 저장 또는 업데이트
            const existing = existingMap[table.name];
            const isAiGenerated = aiTranslations[table.name] !== translateTableName(table.name);
            
            if (existing) {
                existing.koreanName = koreanName;
                existing.columnTranslations = columnTranslations;
                existing.isAiGenerated = isAiGenerated;
                await this.translationRepo.save(existing);
            } else {
                await this.translationRepo.save({
                    connectionId,
                    tableName: table.name,
                    koreanName,
                    columnTranslations,
                    isAiGenerated,
                });
            }
            translated++;
        }
        
        return { translated, skipped };
    }

    /**
     * 단일 테이블의 컬럼만 AI 번역
     */
    async translateSingleTable(connectionId: string, tableName: string): Promise<{ 
        tableName: string; 
        koreanName: string; 
        columnsTranslated: number 
    }> {
        // 1. 컬럼 목록 가져오기
        const columns = await this.schemaService.getColumns(connectionId, tableName);
        
        // 2. AI로 테이블 및 컬럼 번역
        let tableKoreanName = translateTableName(tableName);
        const columnTranslations: Record<string, string> = {};
        
        if (this.aiClient) {
            try {
                // 테이블명과 컬럼명을 한번에 AI 번역 요청
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

                this.logger.log(`AI translating table ${tableName} and ${columns.length} columns...`);

                const response = await this.aiClient.chat.completions.create({
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
                this.logger.log(`AI response for ${tableName}: ${content.substring(0, 200)}...`);
                
                // 응답 파싱
                const lines = content.split('\n').filter(l => l.includes(':'));
                for (const line of lines) {
                    const match = line.match(/[-•]?\s*(\w+)\s*[:：]\s*(.+)/);
                    if (match) {
                        const [, englishName, koreanName] = match;
                        if (englishName.toLowerCase() === tableName.toLowerCase()) {
                            tableKoreanName = koreanName.trim();
                        } else {
                            const foundCol = columns.find(c => c.name.toLowerCase() === englishName.toLowerCase());
                            if (foundCol) {
                                columnTranslations[foundCol.name] = koreanName.trim();
                            }
                        }
                    }
                }
            } catch (error) {
                this.logger.error(`AI translation failed for ${tableName}`, error);
            }
        }
        
        // 사전 번역으로 폴백
        for (const col of columns) {
            if (!columnTranslations[col.name]) {
                columnTranslations[col.name] = translateColumnName(col.name, col.comment);
            }
        }
        
        // 3. 저장
        const existingMap = await this.getTranslationsMap(connectionId);
        const existing = existingMap[tableName];
        
        if (existing) {
            existing.koreanName = tableKoreanName;
            existing.columnTranslations = columnTranslations;
            existing.isAiGenerated = true;
            await this.translationRepo.save(existing);
        } else {
            await this.translationRepo.save({
                connectionId,
                tableName,
                koreanName: tableKoreanName,
                columnTranslations,
                isAiGenerated: true,
            });
        }
        
        return {
            tableName,
            koreanName: tableKoreanName,
            columnsTranslated: columns.length,
        };
    }

    /**
     * AI로 테이블명 일괄 번역
     */
    private async translateTablesWithAi(tableNames: string[]): Promise<Record<string, string>> {
        const result: Record<string, string> = {};

        if (!this.aiClient || tableNames.length === 0) {
            return result;
        }

        try {
            // 모든 테이블에 대해 AI 번역 요청 (사전 번역 스킵 안함)
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

            this.logger.log(`AI translating ${tableNames.length} tables...`);

            const response = await this.aiClient.chat.completions.create({
                model: this.aiModel,
                messages: [
                    {
                        role: 'system',
                        content: '당신은 IT 데이터베이스 전문 번역가입니다. 영어 테이블명을 간결하고 자연스러운 한국어로 번역합니다. 반드시 한글로만 응답하세요.',
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2, // 더 일관된 번역을 위해 낮춤
                max_tokens: 2000,
            });

            const content = response.choices[0]?.message?.content || '';
            this.logger.log(`AI response: ${content.substring(0, 200)}...`);
            
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
                        result[foundTable] = koreanName.trim();
                    }
                }
            }

            this.logger.log(`AI translated ${Object.keys(result).length} tables`);
        } catch (error) {
            this.logger.error('AI translation failed', error);
        }

        // 사전 번역으로 폴백
        for (const name of tableNames) {
            if (!result[name]) {
                result[name] = translateTableName(name);
            }
        }

        return result;
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
            if (koreanDescription) {
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

        return this.translationRepo.save(translation);
    }

    /**
     * 사전 번역만 사용하여 단일 테이블 번역 (AI 폴백용)
     */
    async translateSingleTableWithDictionary(connectionId: string, tableName: string): Promise<{
        tableName: string;
        koreanName: string;
        columnsTranslated: number
    }> {
        const columns = await this.schemaService.getColumns(connectionId, tableName);
        
        const tableKoreanName = translateTableName(tableName);
        const columnTranslations: Record<string, string> = {};
        
        for (const col of columns) {
            columnTranslations[col.name] = translateColumnName(col.name, col.comment);
        }
        
        const existingMap = await this.getTranslationsMap(connectionId);
        const existing = existingMap[tableName];
        
        if (existing) {
            existing.koreanName = tableKoreanName;
            existing.columnTranslations = columnTranslations;
            existing.isAiGenerated = false;
            await this.translationRepo.save(existing);
        } else {
            await this.translationRepo.save({
                connectionId,
                tableName,
                koreanName: tableKoreanName,
                columnTranslations,
                isAiGenerated: false,
            });
        }
        
        return {
            tableName,
            koreanName: tableKoreanName,
            columnsTranslated: columns.length,
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
            // 기존 컬럼 번역 업데이트
            if (!translation.columnTranslations) {
                translation.columnTranslations = {};
            }
            translation.columnTranslations[columnName] = koreanName;
            translation.isAiGenerated = false;
            await this.translationRepo.save(translation);
        } else {
            // 새로 생성
            translation = this.translationRepo.create({
                connectionId,
                tableName,
                koreanName: translateTableName(tableName),
                columnTranslations: { [columnName]: koreanName },
                isAiGenerated: false,
            });
            await this.translationRepo.save(translation);
        }

        return { tableName, columnName, koreanName };
    }
}
