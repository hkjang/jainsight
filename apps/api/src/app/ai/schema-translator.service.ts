/**
 * Schema Translator Service
 * AI 모델을 활용한 테이블/컬럼명 한글 번역 서비스
 * - 1단계: 사전 매핑으로 빠른 번역
 * - 2단계: 미매핑 항목은 AI 모델로 번역
 * - 메모리 캐싱으로 중복 번역 방지
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { AiProvider } from '../ai-admin/entities/ai-provider.entity';
import { translateColumnName, translateTableName, needsAiTranslation as checkNeedsAi } from './column-translator';

interface TranslationCache {
    [key: string]: string;
}

interface SchemaTranslation {
    tableName: string;
    tableKorean: string;
    columns: Array<{
        name: string;
        korean: string;
        type: string;
    }>;
}

@Injectable()
export class SchemaTranslatorService implements OnModuleInit {
    private readonly logger = new Logger(SchemaTranslatorService.name);
    private translationCache: TranslationCache = {};
    private aiClient: OpenAI | null = null;
    private aiModel: string = 'llama2';
    private providerRepo: Repository<AiProvider> | null = null;

    constructor(
        @InjectRepository(AiProvider)
        providerRepo: Repository<AiProvider>,
    ) {
        this.providerRepo = providerRepo;
    }

    async onModuleInit() {
        await this.initializeAiClient();
    }

    /**
     * 활성화된 AI 프로바이더로 클라이언트 초기화
     */
    private async initializeAiClient() {
        try {
            if (!this.providerRepo) return;
            
            const providers = await this.providerRepo.find({
                where: { isActive: true },
                order: { priority: 'ASC' },
                relations: ['models'],
            });

            if (providers.length === 0) {
                this.logger.warn('No active AI providers found for translation');
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
                timeout: provider.timeoutMs,
                maxRetries: provider.retryCount,
            });

            // 첫 번째 모델 사용 또는 기본값
            if (provider.models && provider.models.length > 0) {
                this.aiModel = provider.models[0].modelId;
            }

            this.logger.log(`AI Translation initialized with ${provider.name} (${this.aiModel})`);
        } catch (error) {
            this.logger.error('Failed to initialize AI client for translation', error);
        }
    }

    /**
     * 스키마 전체 번역 (테이블 + 컬럼)
     * AI 번역은 선택적 - 프로바이더 연결 실패 시 사전 번역만 사용
     */
    async translateSchema(
        tables: Array<{
            name: string;
            columns: Array<{ name: string; type: string; comment?: string }>;
        }>,
        useAiTranslation: boolean = false // 기본값 false로 변경 - 안정성 우선
    ): Promise<SchemaTranslation[]> {
        const results: SchemaTranslation[] = [];

        // 1단계: 사전 매핑으로 기본 번역 (항상 수행)
        for (const table of tables) {
            const tableKorean = translateTableName(table.name);
            const columns = table.columns.map(col => ({
                name: col.name,
                korean: translateColumnName(col.name, col.comment),
                type: col.type,
            }));

            results.push({
                tableName: table.name,
                tableKorean,
                columns,
            });
        }

        // 2단계: AI 번역은 명시적으로 요청 시에만 수행 (타임아웃 방지)
        // 현재는 비활성화 - AI 프로바이더 안정화 후 활성화
        if (useAiTranslation && this.aiClient) {
            // AI 번역 로직은 나중에 활성화
            this.logger.log('AI translation requested but skipped for stability');
        }

        return results;
    }

    /**
     * AI 모델로 미번역 항목 일괄 번역
     */
    private async translateWithAi(terms: string[]): Promise<TranslationCache> {
        // 이미 캐시된 항목 제외
        const uncachedTerms = terms.filter(t => !this.translationCache[t]);
        
        if (uncachedTerms.length === 0) {
            return this.getCachedTranslations(terms);
        }

        if (!this.aiClient) {
            this.logger.warn('AI client not available, using fallback translations');
            return {};
        }

        try {
            const termsList = uncachedTerms.map(t => {
                const [type, name] = t.split(':');
                return `- ${name} (${type === 'table' ? '테이블' : '컬럼'})`;
            }).join('\n');

            const prompt = `다음 데이터베이스 영어 용어들을 한글로 간결하게 번역해주세요.
각 항목에 대해 "영어명: 한글명" 형식으로 응답하세요.
추가 설명 없이 번역만 해주세요.

${termsList}`;

            const response = await this.aiClient.chat.completions.create({
                model: this.aiModel,
                messages: [
                    {
                        role: 'system',
                        content: '당신은 데이터베이스 스키마 전문 번역가입니다. 영어 테이블명과 컬럼명을 한글로 간결하게 번역합니다.',
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1000,
            });

            const content = response.choices[0]?.message?.content || '';
            
            // 응답 파싱
            const lines = content.split('\n').filter(l => l.includes(':'));
            for (const line of lines) {
                const match = line.match(/[-•]?\s*(\w+)\s*[:：]\s*(.+)/);
                if (match) {
                    const [, englishName, koreanName] = match;
                    // 캐시에 저장
                    for (const term of uncachedTerms) {
                        if (term.includes(englishName)) {
                            this.translationCache[term] = koreanName.trim();
                        }
                    }
                }
            }

            this.logger.log(`AI translated ${Object.keys(this.translationCache).length} terms`);
        } catch (error) {
            this.logger.error('AI translation failed', error);
        }

        return this.getCachedTranslations(terms);
    }

    /**
     * 캐시된 번역 반환
     */
    private getCachedTranslations(terms: string[]): TranslationCache {
        const result: TranslationCache = {};
        for (const term of terms) {
            if (this.translationCache[term]) {
                result[term] = this.translationCache[term];
            }
        }
        return result;
    }

    /**
     * 단일 용어 AI 번역 (동기적 사전 우선)
     */
    async translateTerm(term: string, type: 'table' | 'column'): Promise<string> {
        const key = `${type}:${term}`;
        
        // 캐시 확인
        if (this.translationCache[key]) {
            return this.translationCache[key];
        }

        // 사전 매핑 시도
        const dictTranslation = type === 'table' 
            ? translateTableName(term) 
            : translateColumnName(term);
        
        if (!checkNeedsAi(term)) {
            return dictTranslation;
        }

        // AI 번역 필요
        if (this.aiClient) {
            const translations = await this.translateWithAi([key]);
            if (translations[key]) {
                return translations[key];
            }
        }

        return dictTranslation;
    }

    /**
     * AI 프롬프트용 스키마 컨텍스트 생성
     */
    buildSchemaContextForPrompt(translations: SchemaTranslation[]): string {
        const lines: string[] = ['[데이터베이스 스키마 (AI 번역)]'];
        lines.push('사용자의 한글 요청을 아래 스키마와 매칭하여 SQL을 생성하세요.\n');

        for (const table of translations) {
            lines.push(`📋 테이블: ${table.tableName} (${table.tableKorean})`);
            
            if (table.columns.length > 0) {
                for (const col of table.columns.slice(0, 25)) {
                    lines.push(`   - ${col.name} [${col.type}]: ${col.korean}`);
                }
                if (table.columns.length > 25) {
                    lines.push(`   ... 그 외 ${table.columns.length - 25}개 컬럼`);
                }
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * 캐시 초기화
     */
    clearCache() {
        this.translationCache = {};
        this.logger.log('Translation cache cleared');
    }
}
