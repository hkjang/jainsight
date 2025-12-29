
import { Injectable } from '@nestjs/common';
import { SchemaService } from '../schema/schema.service';

@Injectable()
export class AiService {
    constructor(private readonly schemaService: SchemaService) { }

    async generateSql(connectionId: string, prompt: string): Promise<{ sql: string; explanation: string }> {
        // 1. Fetch Schema Context
        // We limit to table names for this mock to mimic token optimization
        const tables = await this.schemaService.getTables(connectionId);
        const tableNames = tables.map((t) => t.name).join(', ');

        // 2. Construct System Prompt (Simulated)
        const systemPrompt = `You are an expert SQL assistant. 
    The database contains the following tables: ${tableNames}.
    Generate a SQL query for: "${prompt}"`;

        console.log('--- AI Prompt ---');
        console.log(systemPrompt);
        console.log('-----------------');

        // 3. Mock AI Response
        // In a real implementation, this would call OpenAI/Gemini/Anthropic
        const mockSql = this.generateMockSql(prompt, tables);

        return {
            sql: mockSql,
            explanation: 'This is a generated SQL query based on your prompt (Mock AI).',
        };
    }

    private generateMockSql(prompt: string, tables: any[]): string {
        const tableName = tables.length > 0 ? tables[0].name : 'user';

        // Simple keyword matching for better mock feel
        if (prompt.toLowerCase().includes('count')) {
            return `SELECT COUNT(*) as total FROM ${tableName};`;
        }
        if (prompt.toLowerCase().includes('all') || prompt.toLowerCase().includes('list')) {
            return `SELECT * FROM ${tableName} LIMIT 100;`;
        }
        if (prompt.toLowerCase().includes('where') || prompt.toLowerCase().includes('find')) {
            return `SELECT * FROM ${tableName} WHERE id = 1;`;
        }

        return `SELECT * FROM ${tableName} LIMIT 10; -- Generated from "${prompt}"`;
    }
}
