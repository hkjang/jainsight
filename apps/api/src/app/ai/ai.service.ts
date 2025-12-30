
import { Injectable } from '@nestjs/common';
import { SchemaService } from '../schema/schema.service';
import { SchemaTranslatorService } from './schema-translator.service';
import { translateColumnName, translateTableName } from './column-translator';

@Injectable()
export class AiService {
    constructor(
        private readonly schemaService: SchemaService,
        private readonly schemaTranslator: SchemaTranslatorService,
    ) { }

    /**
     * AI 기반 한글 스키마 번역을 포함한 SQL 생성
     */
    async generateSql(connectionId: string, prompt: string): Promise<{ sql: string; explanation: string; schemaContext?: string }> {
        // 1. Fetch Tables
        const tables = await this.schemaService.getTables(connectionId);
        
        // 2. Fetch Columns for each table
        const schemaData: Array<{
            name: string;
            columns: Array<{ name: string; type: string; comment?: string }>;
        }> = [];

        for (const table of tables.slice(0, 20)) {
            try {
                const columns = await this.schemaService.getColumns(connectionId, table.name);
                schemaData.push({
                    name: table.name,
                    columns: columns.map(col => ({
                        name: col.name,
                        type: col.type || 'unknown',
                        comment: col.comment,
                    })),
                });
            } catch {
                schemaData.push({
                    name: table.name,
                    columns: [],
                });
            }
        }

        // 3. AI 기반 스키마 번역 (미매핑 항목은 AI 모델로 번역)
        let schemaContext: string;
        try {
            const translations = await this.schemaTranslator.translateSchema(schemaData);
            schemaContext = this.schemaTranslator.buildSchemaContextForPrompt(translations);
        } catch (e) {
            // 폴백: 기본 사전 번역만 사용
            schemaContext = this.buildFallbackSchemaContext(schemaData);
        }

        // 4. 시스템 프롬프트 생성
        const systemPrompt = this.buildSystemPrompt(schemaContext, prompt);

        console.log('--- AI Prompt with Full Translation ---');
        console.log(systemPrompt.substring(0, 800) + '...');
        console.log('---------------------------------------');

        // 5. Mock SQL 생성 (실제 AI 호출로 대체 가능)
        const mockSql = this.generateContextAwareSql(prompt, schemaData);

        return {
            sql: mockSql,
            explanation: `이 쿼리는 "${prompt}" 요청을 기반으로 생성되었습니다. ` +
                        `스키마 분석: ${schemaData.length}개 테이블. AI 기반 한글 번역이 적용되었습니다.`,
            schemaContext,
        };
    }

    /**
     * 폴백: 사전 기반 스키마 컨텍스트 생성
     */
    private buildFallbackSchemaContext(schema: Array<{
        name: string;
        columns: Array<{ name: string; type: string; comment?: string }>;
    }>): string {
        const lines: string[] = ['[데이터베이스 스키마 (사전 번역)]'];

        for (const table of schema) {
            const tableKorean = translateTableName(table.name);
            lines.push(`\n📋 테이블: ${table.name} (${tableKorean})`);
            
            for (const col of table.columns.slice(0, 30)) {
                const koreanName = translateColumnName(col.name, col.comment);
                lines.push(`   - ${col.name} [${col.type}]: ${koreanName}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * AI 시스템 프롬프트 생성
     */
    private buildSystemPrompt(schemaContext: string, userPrompt: string): string {
        return `당신은 SQL 전문가입니다. 사용자의 자연어 요청을 SQL 쿼리로 변환합니다.

규칙:
1. 한글 요청에서 언급된 개념을 아래 스키마의 한글명과 정확히 매칭하세요.
2. SELECT 쿼리는 항상 LIMIT을 포함하세요 (기본: 100).
3. 테이블명과 컬럼명은 원본 영어 이름을 사용하세요.
4. 날짜 필터는 created_at 또는 관련 날짜 컬럼을 사용하세요.
5. 명확하지 않은 경우 가장 관련성 높은 테이블을 선택하세요.

${schemaContext}

사용자 요청: "${userPrompt}"

위 스키마를 기반으로 SQL 쿼리를 생성하세요.`;
    }

    /**
     * 컨텍스트 인식 SQL 생성
     */
    private generateContextAwareSql(prompt: string, schema: Array<{
        name: string;
        columns: Array<{ name: string; type: string }>;
    }>): string {
        const lowerPrompt = prompt.toLowerCase();
        
        // 프롬프트에서 테이블 찾기
        let matchedTable = schema.find(t => 
            lowerPrompt.includes(t.name.toLowerCase()) ||
            lowerPrompt.includes(translateTableName(t.name))
        );

        if (!matchedTable) {
            for (const table of schema) {
                const hasMatchingColumn = table.columns.some(col =>
                    lowerPrompt.includes(col.name.toLowerCase()) ||
                    lowerPrompt.includes(translateColumnName(col.name))
                );
                if (hasMatchingColumn) {
                    matchedTable = table;
                    break;
                }
            }
        }

        if (!matchedTable && schema.length > 0) {
            matchedTable = schema[0];
        }

        if (!matchedTable) {
            return `-- 테이블을 찾을 수 없습니다.\nSELECT 1;`;
        }

        const tableName = matchedTable.name;
        const columns = matchedTable.columns;

        // 키워드 기반 쿼리 생성
        if (lowerPrompt.includes('count') || lowerPrompt.includes('개수') || lowerPrompt.includes('몇')) {
            return `SELECT COUNT(*) as total_count FROM ${tableName};`;
        }

        if (lowerPrompt.includes('최근') || lowerPrompt.includes('recent') || lowerPrompt.includes('latest')) {
            const dateCol = columns.find(c => 
                c.name.includes('created') || c.name.includes('date')
            )?.name || 'created_at';
            return `SELECT *\nFROM ${tableName}\nORDER BY ${dateCol} DESC\nLIMIT 10;`;
        }

        if (lowerPrompt.includes('이번 주') || lowerPrompt.includes('지난 주') || lowerPrompt.includes('week')) {
            const dateCol = columns.find(c => 
                c.name.includes('created') || c.name.includes('date')
            )?.name || 'created_at';
            return `SELECT *\nFROM ${tableName}\nWHERE ${dateCol} >= NOW() - INTERVAL '7 days'\nORDER BY ${dateCol} DESC\nLIMIT 100;`;
        }

        if (lowerPrompt.includes('이번 달') || lowerPrompt.includes('month')) {
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
                c.name.includes('type') || c.name.includes('status') || c.name.includes('category')
            )?.name || columns[0]?.name || 'id';
            return `SELECT ${groupCol}, COUNT(*) as count\nFROM ${tableName}\nGROUP BY ${groupCol}\nORDER BY count DESC;`;
        }

        return `SELECT *\nFROM ${tableName}\nLIMIT 100;\n\n-- 요청: "${prompt}"`;
    }
}
