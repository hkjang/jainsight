import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiExecutionLog } from '../entities/ai-execution-log.entity';
import { ModelRouterService, RoutingContext } from './model-router.service';
import { PromptManagerService, PromptVariables } from './prompt-manager.service';
import { SqlSecurityService, SecurityCheckResult } from './sql-security.service';
import { AiProviderService } from './ai-provider.service';
import { SchemaService } from '../../schema/schema.service';
import { TableTranslationService } from '../../schema/table-translation.service';

export interface Nl2SqlRequest {
    userQuery: string;
    connectionId: string;
    userId?: string;
    dbType?: string;
    preferredProviderId?: string;
    preferredModelId?: string;
}

export interface Nl2SqlResponse {
    success: boolean;
    sql?: string;
    explanation?: string;
    securityCheck?: SecurityCheckResult;
    executionLog?: AiExecutionLog;
    error?: string;
}

@Injectable()
export class Nl2SqlPipelineService {
    private readonly logger = new Logger(Nl2SqlPipelineService.name);

    constructor(
        @InjectRepository(AiExecutionLog)
        private readonly logRepo: Repository<AiExecutionLog>,
        private readonly router: ModelRouterService,
        private readonly promptManager: PromptManagerService,
        private readonly securityService: SqlSecurityService,
        private readonly providerService: AiProviderService,
        private readonly schemaService: SchemaService,
        private readonly translationService: TableTranslationService,
    ) {}

    async generateSql(request: Nl2SqlRequest): Promise<Nl2SqlResponse> {
        const startTime = Date.now();
        const log = this.logRepo.create({
            userInput: request.userQuery,
            connectionId: request.connectionId,
            userId: request.userId,
        });

        try {
            // 1. Check prompt security
            const promptSecurityCheck = await this.securityService.checkPromptSecurity(request.userQuery);
            if (promptSecurityCheck.isBlocked) {
                log.success = false;
                log.wasBlocked = true;
                log.blockReason = promptSecurityCheck.reason;
                log.latencyMs = Date.now() - startTime;
                await this.logRepo.save(log);

                return {
                    success: false,
                    error: promptSecurityCheck.reason,
                    securityCheck: promptSecurityCheck,
                };
            }

            // 2. Get schema context
            const tables = await this.schemaService.getTables(request.connectionId);
            const schemaContext = await this.buildSchemaContext(request.connectionId, tables);

            // 3. Select model via router
            const routingContext: RoutingContext = {
                purpose: 'sql',
                dbType: request.dbType,
                preferredProviderId: request.preferredProviderId,
            };
            
            const routedModel = await this.router.selectModel(routingContext);
            if (!routedModel) {
                log.success = false;
                log.errorMessage = 'No suitable model available';
                log.latencyMs = Date.now() - startTime;
                await this.logRepo.save(log);

                return {
                    success: false,
                    error: 'No AI model available for SQL generation',
                };
            }

            log.modelId = routedModel.model.id;
            log.providerId = routedModel.model.providerId;

            // 4. Build prompt
            const promptTemplate = await this.promptManager.findLatestActive('nl2sql');
            const promptContent = promptTemplate?.content || this.promptManager.getDefaultNl2SqlPrompt();

            const variables: PromptVariables = {
                schema: schemaContext,
                userQuery: request.userQuery,
                dbType: request.dbType || 'generic',
            };

            const fullPrompt = promptTemplate 
                ? this.promptManager.renderPrompt(promptTemplate, variables)
                : this.renderDefaultPrompt(variables);

            log.fullPrompt = fullPrompt;
            log.promptTemplateId = promptTemplate?.id;

            // 5. Call AI model
            const client = this.providerService.createOpenAIClient(routedModel.model.provider);
            
            const response = await client.chat.completions.create({
                model: routedModel.model.modelId,
                messages: [
                    ...(routedModel.model.systemPrompt 
                        ? [{ role: 'system' as const, content: routedModel.model.systemPrompt }]
                        : []),
                    { role: 'user' as const, content: fullPrompt },
                ],
                max_tokens: routedModel.model.maxTokens,
                temperature: routedModel.model.temperature,
                top_p: routedModel.model.topP,
            });

            const generatedContent = response.choices[0]?.message?.content || '';
            log.inputTokens = response.usage?.prompt_tokens || 0;
            log.outputTokens = response.usage?.completion_tokens || 0;

            // 6. Extract SQL from response
            const sql = this.extractSql(generatedContent);
            log.generatedSql = sql;

            // 7. SQL security check
            const sqlSecurityCheck = await this.securityService.checkSqlSecurity(sql);
            if (sqlSecurityCheck.isBlocked) {
                log.success = false;
                log.wasBlocked = true;
                log.blockReason = sqlSecurityCheck.reason;
                log.latencyMs = Date.now() - startTime;
                await this.logRepo.save(log);

                return {
                    success: false,
                    sql,
                    error: sqlSecurityCheck.reason,
                    securityCheck: sqlSecurityCheck,
                    executionLog: log,
                };
            }

            // 8. Apply result limit
            const finalSql = this.securityService.addLimitClause(sqlSecurityCheck.sanitizedSql || sql);

            log.success = true;
            log.generatedSql = finalSql;
            log.latencyMs = Date.now() - startTime;
            await this.logRepo.save(log);

            return {
                success: true,
                sql: finalSql,
                explanation: this.extractExplanation(generatedContent),
                securityCheck: sqlSecurityCheck,
                executionLog: log,
            };
        } catch (error) {
            log.success = false;
            log.errorMessage = error.message;
            log.latencyMs = Date.now() - startTime;
            await this.logRepo.save(log);

            this.logger.error(`NL2SQL generation failed: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                executionLog: log,
            };
        }
    }

    private async buildSchemaContext(connectionId: string, tables: any[]): Promise<string> {
        const lines: string[] = ['Tables in database (테이블명 / 한글명):'];
        
        // 번역 정보 조회
        let translations: Record<string, any> = {};
        try {
            translations = await this.translationService.getTranslationsMap(connectionId);
        } catch (e) {
            this.logger.warn(`Failed to get translations: ${e.message}`);
        }
        
        this.logger.log(`Building schema context: ${tables.length} tables found`);
        
        for (const table of tables.slice(0, 50)) { // Increased to 50 tables
            const translation = translations[table.name];
            const koreanName = translation?.koreanName || table.name;
            lines.push(`\n## ${table.name} (${koreanName})`);
            
            try {
                const columns = await this.schemaService.getColumns(connectionId, table.name);
                const columnTranslations = translation?.columnTranslations || {};
                
                for (const col of columns.slice(0, 50)) { // Increased to 50 columns per table
                    const colKorean = columnTranslations[col.name] || col.name;
                    lines.push(`  - ${col.name} (${colKorean}): ${col.type}${col.primaryKey ? ' (PK)' : ''}${col.nullable ? '' : ' NOT NULL'}`);
                }
            } catch {
                lines.push('  (columns not available)');
            }
        }
        
        this.logger.log(`Schema context built with ${lines.length} lines`);

        return lines.join('\n');
    }

    /**
     * 연결된 DB의 스키마 기반으로 추천 질문 생성
     */
    async generateSuggestedQuestions(connectionId: string): Promise<{ questions: string[] }> {
        try {
            // 1. 스키마 정보 조회
            const tables = await this.schemaService.getTables(connectionId);
            let translations: Record<string, any> = {};
            try {
                translations = await this.translationService.getTranslationsMap(connectionId);
            } catch (e) {
                this.logger.warn(`Failed to get translations: ${e.message}`);
            }
            
            if (tables.length === 0) {
                return { questions: ['테이블 목록 조회', '데이터베이스 정보 확인'] };
            }

            // 2. 주요 테이블과 컬럼 정보 요약
            const tableDetails: string[] = [];
            for (const t of tables.slice(0, 8)) {
                try {
                    const columns = await this.schemaService.getColumns(connectionId, t.name);
                    const translation = translations[t.name];
                    const koreanName = translation?.koreanName || t.name;
                    const columnNames = columns.slice(0, 5).map(c => {
                        const colKorean = translation?.columnTranslations?.[c.name] || c.name;
                        return `${c.name}(${colKorean})`;
                    }).join(', ');
                    tableDetails.push(`- ${t.name}(${koreanName}): ${columnNames}`);
                } catch {
                    tableDetails.push(`- ${t.name}`);
                }
            }

            // 3. AI 사용 가능한지 확인
            const routingContext: RoutingContext = { purpose: 'sql' };
            const routedModel = await this.router.selectModel(routingContext);
            
            if (!routedModel) {
                // AI 없으면 기본 추천 질문 반환
                return this.getDefaultSuggestedQuestions(tables, translations);
            }

            // 4. AI로 추천 질문 생성
            const client = this.providerService.createOpenAIClient(routedModel.model.provider);
            
            const prompt = `다음 데이터베이스 스키마를 분석하여 한국어 질문 예시 6개를 생성하세요.

## 테이블 및 컬럼 정보
${tableDetails.join('\n')}

## 규칙
1. 간결한 한국어로 작성 (10~25자)
2. 다양한 유형의 질문 포함:
   - 전체 조회 ("~목록 보기")
   - 조건 검색 ("~인 데이터")
   - 최신순 조회 ("최근 ~")
   - 통계/집계 ("~수", "~별 현황")
   - TOP N ("상위 10개")
3. 각 질문은 새 줄에 작성 (번호/기호 없이)
4. 테이블명 대신 한글명 사용

예시:
최근 생성된 사용자 10명
부서별 직원 수
이번 달 등록된 주문`;

            const response = await client.chat.completions.create({
                model: routedModel.model.modelId,
                messages: [
                    { role: 'system' as const, content: '데이터베이스 질문 예시를 생성하는 도우미입니다. 한국어로 간결하게 응답하세요.' },
                    { role: 'user' as const, content: prompt }
                ],
                max_tokens: 400,
                temperature: 0.8,
            });

            const content = response.choices[0]?.message?.content || '';
            const questions = content
                .split('\n')
                .map(q => q.trim().replace(/^[-•\d.)\]]+\s*/, '')) // 번호/기호 제거
                .filter(q => q.length >= 5 && q.length < 40 && !q.startsWith('#') && !q.includes(':'))
                .slice(0, 6);

            if (questions.length === 0) {
                return this.getDefaultSuggestedQuestions(tables, translations);
            }

            this.logger.log(`Generated ${questions.length} suggested questions`);
            return { questions };
        } catch (error) {
            this.logger.error(`Failed to generate suggested questions: ${error.message}`);
            return { questions: ['전체 데이터 조회', '최근 데이터 확인', '통계 조회'] };
        }
    }

    private getDefaultSuggestedQuestions(tables: any[], translations: Record<string, any>): { questions: string[] } {
        const questions: string[] = [];
        
        for (const table of tables.slice(0, 5)) {
            const koreanName = translations[table.name]?.koreanName || table.name;
            if (koreanName !== table.name) {
                questions.push(`${koreanName} 전체 조회`);
            } else {
                questions.push(`${table.name} 데이터 조회`);
            }
        }

        return { questions: questions.length > 0 ? questions : ['데이터 조회', '최근 데이터 확인'] };
    }

    private renderDefaultPrompt(variables: PromptVariables): string {
        const isPostgres = (variables.dbType || '').toLowerCase().includes('postgres');
        const quoteNote = isPostgres 
            ? '- For PostgreSQL: Use double quotes around table/column names to preserve case (e.g., "CareerMovement", "startDate")'
            : '';
        
        return `You are an expert SQL query generator. Given a natural language question and database schema information, generate a valid SQL query.

CRITICAL: 
- Use EXACT table and column names from the schema with CORRECT CASE
${quoteNote}
- The schema includes Korean translations in parentheses for reference

## Database Schema
${variables.schema}

## User Question
${variables.userQuery}

## Instructions
1. Generate ONLY the SQL query, no explanations
2. Use the EXACT English table/column names from the schema${isPostgres ? ' with double quotes' : ''}
3. Match Korean keywords in the question to Korean translations to find correct tables/columns
4. Add LIMIT 100 clause for SELECT queries
5. Use standard SQL syntax compatible with ${variables.dbType || 'PostgreSQL'}

## Generated SQL:`;
    }

    private extractSql(content: string): string {
        // Try to extract SQL from markdown code blocks
        const codeBlockMatch = content.match(/```sql?\s*([\s\S]*?)```/i);
        if (codeBlockMatch) {
            return codeBlockMatch[1].trim();
        }

        // Try to find SQL statements
        const selectMatch = content.match(/(SELECT[\s\S]*?;)/i);
        if (selectMatch) {
            return selectMatch[1].trim();
        }

        // Return cleaned content
        return content.trim().replace(/^(sql|SQL):\s*/i, '');
    }

    private extractExplanation(content: string): string | undefined {
        // Try to extract explanation after SQL block
        const parts = content.split(/```sql?[\s\S]*?```/i);
        if (parts.length > 1 && parts[1].trim()) {
            return parts[1].trim();
        }
        return undefined;
    }

    /**
     * SQL 실행 에러를 AI로 분석하여 원인과 해결 방법 제공
     */
    async analyzeQueryError(
        connectionId: string,
        query: string,
        errorMessage: string,
    ): Promise<{ cause: string; solution: string; correctedQuery?: string }> {
        try {
            // 스키마 정보 조회
            const tables = await this.schemaService.getTables(connectionId);
            let translations: Record<string, any> = {};
            try {
                translations = await this.translationService.getTranslationsMap(connectionId);
            } catch {}

            // 스키마 컨텍스트 구성
            const tableInfo = tables.slice(0, 15).map(t => {
                const korean = translations[t.name]?.koreanName || t.name;
                return `${t.name} (${korean})`;
            }).join(', ');

            // AI 모델 선택
            const routingContext: RoutingContext = { purpose: 'sql' };
            const routedModel = await this.router.selectModel(routingContext);
            
            if (!routedModel) {
                return this.getDefaultErrorAnalysis(errorMessage);
            }

            const client = this.providerService.createOpenAIClient(routedModel.model.provider);
            
            const prompt = `SQL 쿼리 실행 오류를 분석해주세요.

## 오류 메시지
${errorMessage}

## 실행한 쿼리
${query}

## 데이터베이스 테이블 목록
${tableInfo}

## 응답 형식 (JSON으로 응답)
{
  "cause": "오류 원인 설명 (한국어, 1-2문장)",
  "solution": "해결 방법 (한국어, 구체적인 조치)",
  "correctedQuery": "수정된 쿼리 (있는 경우만)"
}`;

            const response = await client.chat.completions.create({
                model: routedModel.model.modelId,
                messages: [
                    { role: 'system' as const, content: 'SQL 오류 분석 전문가입니다. 반드시 유효한 JSON 형식으로 응답하세요.' },
                    { role: 'user' as const, content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.3,
            });

            const content = response.choices[0]?.message?.content || '';
            
            try {
                // JSON 추출 시도
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        cause: parsed.cause || '알 수 없는 오류',
                        solution: parsed.solution || '쿼리를 다시 확인해주세요',
                        correctedQuery: parsed.correctedQuery || undefined,
                    };
                }
            } catch {
                // JSON 파싱 실패 시 텍스트 분석
                this.logger.warn('Failed to parse AI error analysis as JSON');
            }

            return this.getDefaultErrorAnalysis(errorMessage);
        } catch (error) {
            this.logger.error(`Failed to analyze query error: ${error.message}`);
            return this.getDefaultErrorAnalysis(errorMessage);
        }
    }

    private getDefaultErrorAnalysis(errorMessage: string): { cause: string; solution: string } {
        const lowerMsg = errorMessage.toLowerCase();
        
        if (lowerMsg.includes('not found') || lowerMsg.includes('does not exist')) {
            return {
                cause: '테이블이나 컬럼명이 존재하지 않거나 대소문자가 맞지 않습니다.',
                solution: 'Schema Browser에서 정확한 테이블/컬럼명을 확인하세요. PostgreSQL의 경우 대소문자가 섞인 이름은 따옴표("")로 감싸야 합니다.',
            };
        }
        
        if (lowerMsg.includes('syntax')) {
            return {
                cause: 'SQL 문법 오류가 있습니다.',
                solution: '쿼리의 키워드, 쉼표, 괄호 등을 확인하세요.',
            };
        }
        
        if (lowerMsg.includes('permission') || lowerMsg.includes('access denied')) {
            return {
                cause: '데이터베이스 접근 권한이 없습니다.',
                solution: '데이터베이스 관리자에게 필요한 권한을 요청하세요.',
            };
        }

        return {
            cause: '쿼리 실행 중 오류가 발생했습니다.',
            solution: '오류 메시지를 확인하고 쿼리를 수정해주세요.',
        };
    }
}
