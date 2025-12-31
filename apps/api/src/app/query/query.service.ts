import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseConnectorService, QueryResult } from '../database-connector/database-connector.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import { AuditService } from '../audit/audit.service';
import { ConnectionsService } from '../connections/connections.service';
import { SecuritySettingsService } from '../ai-admin/services/security-settings.service';

@Injectable()
export class QueryService {
    constructor(
        private connectionsService: ConnectionsService,
        private databaseConnectorService: DatabaseConnectorService,
        private auditService: AuditService,
        private securitySettingsService: SecuritySettingsService,
    ) { }

    async executeQuery(executeQueryDto: ExecuteQueryDto): Promise<QueryResult> {
        // Use the service method to secure access to the decrypted password
        const connection = await this.connectionsService.getConnectionWithPassword(executeQueryDto.connectionId);

        if (!connection) {
            throw new NotFoundException(`Connection with ID ${executeQueryDto.connectionId} not found`);
        }

        // Security Check - Apply security settings
        const securityCheck = await this.checkQuerySecurity(executeQueryDto.query);
        if (securityCheck.blocked) {
            throw new ForbiddenException(securityCheck.reason);
        }

        // Apply result limit if needed
        let finalQuery = executeQueryDto.query;
        if (securityCheck.maxResultRows && this.isSelectQuery(finalQuery)) {
            finalQuery = this.addLimitClause(finalQuery, securityCheck.maxResultRows);
        }

        const startTime = Date.now();
        let status: 'SUCCESS' | 'FAILURE' = 'SUCCESS';
        let errorMessage: string | undefined;
        let result: QueryResult | undefined;

        try {
            result = await this.databaseConnectorService.executeQuery(
                connection.id,
                {
                    name: connection.name,
                    type: connection.type,
                    host: connection.host,
                    port: connection.port,
                    username: connection.username,
                    password: connection.password,
                    database: connection.database,
                },
                finalQuery
            );
            return result;
        } catch (error) {
            status = 'FAILURE';
            errorMessage = error.message;
            // Provide user-friendly error hints
            const enhancedError = this.enhanceErrorMessage(error.message);
            throw new Error(enhancedError);
        } finally {
            const durationMs = Date.now() - startTime;
            // Fire and forget audit logging, but catching errors to not affect response
            this.auditService.logQuery({
                connectionId: connection.id,
                connectionName: connection.name,
                query: executeQueryDto.query,
                status,
                durationMs,
                rowCount: result?.rowCount,
                errorMessage,
            }).catch(err => console.error('Failed to log audit:', err));
        }
    }

    private async checkQuerySecurity(query: string): Promise<{ blocked: boolean; reason?: string; maxResultRows?: number }> {
        try {
            const settings = await this.securitySettingsService.getSettings();
            const upperQuery = query.toUpperCase().trim();

            // DDL Check
            if (settings.enableDdlBlock) {
                const ddlKeywords = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME', 'GRANT', 'REVOKE'];
                for (const keyword of ddlKeywords) {
                    if (new RegExp(`\\b${keyword}\\b`, 'i').test(upperQuery)) {
                        return { blocked: true, reason: `DDL 문 (${keyword})이 보안 정책에 의해 차단되었습니다` };
                    }
                }
            }

            // DML Check
            if (settings.enableDmlBlock) {
                const dmlKeywords = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT'];
                for (const keyword of dmlKeywords) {
                    if (new RegExp(`\\b${keyword}\\b`, 'i').test(upperQuery)) {
                        return { blocked: true, reason: `DML 문 (${keyword})이 보안 정책에 의해 차단되었습니다` };
                    }
                }
            }

            // Blocked Keywords Check
            if (settings.blockedKeywords) {
                const keywords = settings.blockedKeywords.split(',').map(k => k.trim()).filter(Boolean);
                for (const keyword of keywords) {
                    if (new RegExp(`\\b${keyword}\\b`, 'gi').test(query)) {
                        return { blocked: true, reason: `차단된 키워드 "${keyword}"가 포함되어 있습니다` };
                    }
                }
            }

            // SQL Injection Check
            if (settings.enableSqlInjectionCheck) {
                const sqlInjectionPatterns = [
                    /(;\s*(drop|delete|truncate|alter|create)\s+)/gi,
                    /(or\s+1\s*=\s*1)/gi,
                    /(union\s+select)/gi,
                ];
                for (const pattern of sqlInjectionPatterns) {
                    if (pattern.test(query)) {
                        return { blocked: true, reason: 'SQL Injection 패턴이 감지되어 차단되었습니다' };
                    }
                }
            }

            return { blocked: false, maxResultRows: settings.maxResultRows };
        } catch (error) {
            // If security service fails, allow query but log error
            console.error('Security check failed:', error);
            return { blocked: false, maxResultRows: 1000 };
        }
    }

    private isSelectQuery(query: string): boolean {
        return query.trim().toUpperCase().startsWith('SELECT');
    }

    private addLimitClause(sql: string, maxRows: number): string {
        // Check if already has LIMIT
        if (/\bLIMIT\s+\d+/i.test(sql)) {
            return sql;
        }
        // Check if already has FETCH FIRST (ANSI SQL)
        if (/FETCH\s+(FIRST|NEXT)\s+\d+/i.test(sql)) {
            return sql;
        }
        // Add LIMIT clause
        return `${sql.replace(/;\s*$/, '')} LIMIT ${maxRows}`;
    }

    private enhanceErrorMessage(originalMessage: string): string {
        const lowerMsg = originalMessage.toLowerCase();
        
        // Table/relation not found
        if (lowerMsg.includes('no such table') || lowerMsg.includes('relation') && lowerMsg.includes('does not exist')) {
            const match = originalMessage.match(/(?:table|relation)\s*["']?(\w+)["']?/i);
            const tableName = match ? match[1] : 'unknown';
            return `Table "${tableName}" not found. Check table name spelling or verify the table exists in the selected database.`;
        }
        
        // Column not found
        if (lowerMsg.includes('no such column') || lowerMsg.includes('column') && lowerMsg.includes('does not exist')) {
            return `Column not found. Verify column names match the table schema. Use Schema Explorer to check available columns.`;
        }
        
        // Syntax error
        if (lowerMsg.includes('syntax error') || lowerMsg.includes('syntax')) {
            return `SQL Syntax Error: ${originalMessage}. Check for missing commas, quotes, or keywords.`;
        }
        
        // Connection issues
        if (lowerMsg.includes('connection refused') || lowerMsg.includes('econnrefused')) {
            return `Connection refused. The database server may be offline or the connection settings are incorrect.`;
        }
        
        // Timeout
        if (lowerMsg.includes('timeout')) {
            return `Query timeout. The query took too long. Try optimizing with indexes or limiting results.`;
        }
        
        // Permission denied
        if (lowerMsg.includes('permission denied') || lowerMsg.includes('access denied')) {
            return `Access denied. Check that the database user has the required permissions.`;
        }
        
        return originalMessage;
    }
}

