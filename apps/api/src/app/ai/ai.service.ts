
import { Injectable } from '@nestjs/common';
import { SchemaService } from '../schema/schema.service';
import { translateColumnName, translateTableName, buildSchemaContextForAI } from './column-translator';

@Injectable()
export class AiService {
    constructor(private readonly schemaService: SchemaService) { }

    /**
     * 한글 컬럼 설명이 포함된 스키마 컨텍스트를 생성하여 AI 쿼리 생성 품질 향상
     */
    async generateSql(connectionId: string, prompt: string): Promise<{ sql: string; explanation: string; schemaContext?: string }> {
        // 1. Fetch Tables
        const tables = await this.schemaService.getTables(connectionId);
        
        // 2. Fetch Columns for each table with Korean translations
        const schemaWithColumns = await this.buildEnhancedSchemaContext(connectionId, tables);
        
        // 3. Build comprehensive schema context with Korean explanations
        const schemaContext = this.buildKoreanSchemaContext(schemaWithColumns);
        
        // 4. Construct enhanced system prompt
        const systemPrompt = this.buildSystemPrompt(schemaContext, prompt);

        console.log('--- Enhanced AI Prompt with Korean Context ---');
        console.log(systemPrompt.substring(0, 500) + '...');
        console.log('----------------------------------------------');

        // 5. Generate SQL (Mock implementation - replace with actual AI call)
        const mockSql = this.generateContextAwareSql(prompt, schemaWithColumns);

        return {
            sql: mockSql,
            explanation: this.generateExplanation(prompt, schemaWithColumns),
            schemaContext,
        };
    }

    /**
     * 각 테이블의 컬럼 정보를 한글 번역과 함께 가져옴
     */
    private async buildEnhancedSchemaContext(
        connectionId: string,
        tables: Array<{ name: string }>
    ): Promise<Array<{
        name: string;
        koreanName: string;
        columns: Array<{ name: string; koreanName: string; type: string }>;
    }>> {
        const result = [];

        for (const table of tables.slice(0, 20)) { // Limit to 20 tables for performance
            try {
                const columns = await this.schemaService.getColumns(connectionId, table.name);
                
                result.push({
                    name: table.name,
                    koreanName: translateTableName(table.name),
                    columns: columns.map(col => ({
                        name: col.name,
                        koreanName: translateColumnName(col.name, col.comment),
                        type: col.type || 'unknown',
                    })),
                });
            } catch (e) {
                // Skip tables that can't be accessed
                result.push({
                    name: table.name,
                    koreanName: translateTableName(table.name),
                    columns: [],
                });
            }
        }

        return result;
    }

    /**
     * 한글 설명이 포함된 스키마 컨텍스트 생성
     */
    private buildKoreanSchemaContext(schema: Array<{
        name: string;
        koreanName: string;
        columns: Array<{ name: string; koreanName: string; type: string }>;
    }>): string {
        const lines: string[] = ['[데이터베이스 스키마 (한글 설명 포함)]'];
        lines.push('사용자가 한글로 질문할 때 아래 한글명을 참고하여 적절한 컬럼을 선택하세요.\n');

        for (const table of schema) {
            lines.push(`📋 테이블: ${table.name} (${table.koreanName})`);
            
            if (table.columns.length > 0) {
                for (const col of table.columns.slice(0, 30)) { // Limit columns
                    lines.push(`   - ${col.name} [${col.type}]: ${col.koreanName}`);
                }
                if (table.columns.length > 30) {
                    lines.push(`   ... 그 외 ${table.columns.length - 30}개 컬럼`);
                }
            } else {
                lines.push('   (컬럼 정보 없음)');
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * AI 시스템 프롬프트 생성
     */
    private buildSystemPrompt(schemaContext: string, userPrompt: string): string {
        return `당신은 SQL 전문가입니다. 사용자의 자연어 요청을 SQL 쿼리로 변환합니다.

규칙:
1. 한글 요청에서 언급된 개념을 아래 스키마의 한글명과 매칭하여 적절한 테이블/컬럼을 선택하세요.
2. SELECT 쿼리는 항상 LIMIT을 포함하세요 (기본: 100).
3. 명확하지 않은 경우 가장 관련성 높은 테이블을 선택하세요.
4. 날짜 필터는 created_at 또는 관련 날짜 컬럼을 사용하세요.

${schemaContext}

사용자 요청: "${userPrompt}"

위 스키마를 기반으로 SQL 쿼리를 생성하세요.`;
    }

    /**
     * 컨텍스트 인식 SQL 생성 (향상된 Mock 구현)
     */
    private generateContextAwareSql(prompt: string, schema: Array<{
        name: string;
        koreanName: string;
        columns: Array<{ name: string; koreanName: string; type: string }>;
    }>): string {
        const lowerPrompt = prompt.toLowerCase();
        
        // 프롬프트에서 테이블 찾기 (한글명 또는 영문명 매칭)
        let matchedTable = schema.find(t => 
            lowerPrompt.includes(t.name.toLowerCase()) ||
            lowerPrompt.includes(t.koreanName)
        );

        // 매칭되는 테이블이 없으면 컬럼명으로 테이블 추정
        if (!matchedTable) {
            for (const table of schema) {
                const hasMatchingColumn = table.columns.some(col =>
                    lowerPrompt.includes(col.name.toLowerCase()) ||
                    lowerPrompt.includes(col.koreanName)
                );
                if (hasMatchingColumn) {
                    matchedTable = table;
                    break;
                }
            }
        }

        // 여전히 없으면 첫 번째 테이블 사용
        if (!matchedTable && schema.length > 0) {
            matchedTable = schema[0];
        }

        if (!matchedTable) {
            return `-- 테이블을 찾을 수 없습니다. 스키마를 확인해주세요.\nSELECT 1;`;
        }

        const tableName = matchedTable.name;
        const columns = matchedTable.columns;

        // 키워드 기반 쿼리 생성
        if (lowerPrompt.includes('count') || lowerPrompt.includes('개수') || lowerPrompt.includes('몇')) {
            return `SELECT COUNT(*) as total_count FROM ${tableName};`;
        }

        if (lowerPrompt.includes('최근') || lowerPrompt.includes('recent') || lowerPrompt.includes('latest')) {
            const dateCol = columns.find(c => 
                c.name.includes('created') || 
                c.name.includes('date') || 
                c.koreanName.includes('생성') ||
                c.koreanName.includes('일시')
            )?.name || 'created_at';
            
            return `SELECT *\nFROM ${tableName}\nORDER BY ${dateCol} DESC\nLIMIT 10;`;
        }

        if (lowerPrompt.includes('이번 주') || lowerPrompt.includes('this week') || lowerPrompt.includes('last week') || lowerPrompt.includes('지난 주')) {
            const dateCol = columns.find(c => 
                c.name.includes('created') || c.name.includes('date')
            )?.name || 'created_at';
            
            return `SELECT *\nFROM ${tableName}\nWHERE ${dateCol} >= NOW() - INTERVAL '7 days'\nORDER BY ${dateCol} DESC\nLIMIT 100;`;
        }

        if (lowerPrompt.includes('이번 달') || lowerPrompt.includes('this month')) {
            const dateCol = columns.find(c => 
                c.name.includes('created') || c.name.includes('date')
            )?.name || 'created_at';
            
            return `SELECT *\nFROM ${tableName}\nWHERE ${dateCol} >= DATE_TRUNC('month', NOW())\nORDER BY ${dateCol} DESC\nLIMIT 100;`;
        }

        if (lowerPrompt.includes('통계') || lowerPrompt.includes('stats') || lowerPrompt.includes('summary')) {
            const numericCols = columns.filter(c => 
                ['int', 'integer', 'numeric', 'decimal', 'float', 'double', 'bigint'].some(t => 
                    c.type.toLowerCase().includes(t)
                )
            );
            
            if (numericCols.length > 0) {
                const col = numericCols[0].name;
                return `SELECT \n  COUNT(*) as total_count,\n  AVG(${col}) as avg_${col},\n  MAX(${col}) as max_${col},\n  MIN(${col}) as min_${col}\nFROM ${tableName};`;
            }
        }

        if (lowerPrompt.includes('그룹') || lowerPrompt.includes('group') || lowerPrompt.includes('별로')) {
            const groupCol = columns.find(c => 
                c.name.includes('type') || 
                c.name.includes('status') ||
                c.name.includes('category') ||
                c.koreanName.includes('유형') ||
                c.koreanName.includes('상태')
            )?.name || columns[0]?.name || 'id';
            
            return `SELECT ${groupCol}, COUNT(*) as count\nFROM ${tableName}\nGROUP BY ${groupCol}\nORDER BY count DESC;`;
        }

        // 기본 쿼리
        return `SELECT *\nFROM ${tableName}\nLIMIT 100;\n\n-- 생성된 쿼리: "${prompt}"`;
    }

    /**
     * 쿼리 설명 생성
     */
    private generateExplanation(prompt: string, schema: Array<{
        name: string;
        koreanName: string;
        columns: Array<{ name: string; koreanName: string; type: string }>;
    }>): string {
        const tableCount = schema.length;
        const totalColumns = schema.reduce((sum, t) => sum + t.columns.length, 0);
        
        return `이 쿼리는 "${prompt}" 요청을 기반으로 생성되었습니다. ` +
               `분석된 스키마: ${tableCount}개 테이블, ${totalColumns}개 컬럼. ` +
               `한글 컬럼명 매핑을 사용하여 가장 적합한 테이블과 컬럼을 선택했습니다.`;
    }
}
