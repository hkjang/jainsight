import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiExecutionLog } from '../entities/ai-execution-log.entity';
import { ModelRouterService, RoutingContext } from './model-router.service';
import { PromptManagerService, PromptVariables } from './prompt-manager.service';
import { SqlSecurityService, SecurityCheckResult } from './sql-security.service';
import { AiProviderService } from './ai-provider.service';
import { SchemaService } from '../../schema/schema.service';

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
        const lines: string[] = ['Tables in database:'];
        
        for (const table of tables.slice(0, 20)) { // Limit to 20 tables
            lines.push(`\n## ${table.name}`);
            
            try {
                const columns = await this.schemaService.getColumns(connectionId, table.name);
                for (const col of columns.slice(0, 30)) { // Limit to 30 columns per table
                    lines.push(`  - ${col.name}: ${col.type}${col.primaryKey ? ' (PK)' : ''}${col.nullable ? '' : ' NOT NULL'}`);
                }
            } catch {
                lines.push('  (columns not available)');
            }
        }

        return lines.join('\n');
    }

    private renderDefaultPrompt(variables: PromptVariables): string {
        return `You are an expert SQL query generator. Given a natural language question and database schema information, generate a valid SQL query.

## Database Schema
${variables.schema}

## User Question
${variables.userQuery}

## Instructions
1. Generate ONLY the SQL query, no explanations
2. Use proper table and column names from the schema
3. Add appropriate LIMIT clause for large result sets
4. Use standard SQL syntax compatible with ${variables.dbType || 'most databases'}

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
}
