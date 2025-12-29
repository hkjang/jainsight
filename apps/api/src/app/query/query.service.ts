import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseConnectorService, QueryResult } from '../database-connector/database-connector.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import { AuditService } from '../audit/audit.service';
import { ConnectionsService } from '../connections/connections.service';

@Injectable()
export class QueryService {
    constructor(
        private connectionsService: ConnectionsService,
        private databaseConnectorService: DatabaseConnectorService,
        private auditService: AuditService,
    ) { }

    async executeQuery(executeQueryDto: ExecuteQueryDto): Promise<QueryResult> {
        // Use the service method to secure access to the decrypted password
        const connection = await this.connectionsService.getConnectionWithPassword(executeQueryDto.connectionId);

        if (!connection) {
            throw new NotFoundException(`Connection with ID ${executeQueryDto.connectionId} not found`);
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
                executeQueryDto.query
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

    private enhanceErrorMessage(originalMessage: string): string {
        const lowerMsg = originalMessage.toLowerCase();
        
        // Table/relation not found
        if (lowerMsg.includes('no such table') || lowerMsg.includes('relation') && lowerMsg.includes('does not exist')) {
            const match = originalMessage.match(/(?:table|relation)\s*["\']?(\w+)["\']?/i);
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
