
import { Injectable, Logger } from '@nestjs/common';
import { SchemaService } from '../schema/schema.service';
import { SchemaTranslatorService } from './schema-translator.service';
import { translateColumnName, translateTableName } from './column-translator';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

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
        
        // 2. Fetch Columns for each table with translations
        const schemaData: Array<{
            name: string;
            koreanName: string;
            columns: Array<{ name: string; koreanName: string; type: string; comment?: string }>;
        }> = [];

        for (const table of tables.slice(0, 20)) {
            try {
                const columns = await this.schemaService.getColumns(connectionId, table.name);
                const koreanTableName = translateTableName(table.name);
                schemaData.push({
                    name: table.name,
                    koreanName: koreanTableName,
                    columns: columns.map(col => ({
                        name: col.name,
                        koreanName: translateColumnName(col.name, col.comment),
                        type: col.type || 'unknown',
                        comment: col.comment,
                    })),
                });
            } catch {
                schemaData.push({
                    name: table.name,
                    koreanName: translateTableName(table.name),
                    columns: [],
                });
            }
        }

        // 3. 스키마 컨텍스트 생성
        const schemaContext = this.buildSchemaContext(schemaData);

        // 4. 로그
        this.logger.log(`--- Schema Context (${schemaData.length} tables) ---`);
        schemaData.forEach(t => this.logger.log(`  ${t.name} -> ${t.koreanName}`));

        // 5. 테이블 매칭 및 SQL 생성
        const sql = this.generateContextAwareSql(prompt, schemaData);

        return {
            sql,
            explanation: `이 쿼리는 "${prompt}" 요청을 기반으로 생성되었습니다. ` +
                        `스키마 분석: ${schemaData.length}개 테이블에서 한글 매칭 수행.`,
            schemaContext,
        };
    }

    /**
     * 스키마 컨텍스트 생성 (테이블명 + 컬럼명 한글 포함)
     */
    private buildSchemaContext(schema: Array<{
        name: string;
        koreanName: string;
        columns: Array<{ name: string; koreanName: string; type: string }>;
    }>): string {
        const lines: string[] = ['[데이터베이스 스키마 - 한글 번역]'];
        lines.push('');

        for (const table of schema) {
            lines.push(`📋 ${table.name} (${table.koreanName})`);
            
            for (const col of table.columns.slice(0, 20)) {
                lines.push(`   - ${col.name}: ${col.koreanName} [${col.type}]`);
            }
            if (table.columns.length > 20) {
                lines.push(`   ... 그 외 ${table.columns.length - 20}개 컬럼`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * 한글 키워드 기반 테이블 매칭
     */
    private findMatchingTable(
        prompt: string, 
        schema: Array<{
            name: string;
            koreanName: string;
            columns: Array<{ name: string; koreanName: string; type: string }>;
        }>
    ): typeof schema[0] | null {
        const lowerPrompt = prompt.toLowerCase();

        // 1. 한글 테이블명 직접 매칭 (우선순위 높음)
        const koreanKeywords = [
            { keyword: '사용자', tables: ['user', 'users', 'member', 'members', 'account', 'accounts'] },
            { keyword: '주문', tables: ['order', 'orders', 'purchase', 'purchases'] },
            { keyword: '상품', tables: ['product', 'products', 'item', 'items'] },
            { keyword: '고객', tables: ['customer', 'customers', 'client', 'clients'] },
            { keyword: '결제', tables: ['payment', 'payments', 'transaction', 'transactions'] },
            { keyword: '로그', tables: ['log', 'logs', 'audit', 'audit_log'] },
            { keyword: '직원', tables: ['employee', 'employees', 'staff'] },
            { keyword: '부서', tables: ['department', 'departments', 'dept'] },
            { keyword: '게시글', tables: ['post', 'posts', 'article', 'articles'] },
            { keyword: '댓글', tables: ['comment', 'comments', 'reply', 'replies'] },
            { keyword: '알림', tables: ['notification', 'notifications', 'alert', 'alerts'] },
            { keyword: '설정', tables: ['setting', 'settings', 'config', 'configuration'] },
            { keyword: '연결', tables: ['connection', 'connections', 'db_connection'] },
            { keyword: '크롤러', tables: ['crawler', 'crawlers'] },
            { keyword: '요구사항', tables: ['requirement', 'requirements'] },
            { keyword: '월급', tables: ['salary', 'salaryitem', 'salaries'] },
            { keyword: '급여', tables: ['salary', 'salaryitem', 'salaries', 'payroll'] },
        ];

        for (const { keyword, tables } of koreanKeywords) {
            if (prompt.includes(keyword)) {
                const match = schema.find(t => 
                    tables.some(tbl => t.name.toLowerCase().includes(tbl))
                );
                if (match) {
                    this.logger.log(`Matched table by keyword "${keyword}": ${match.name}`);
                    return match;
                }
            }
        }

        // 2. 스키마의 한글 테이블명과 매칭
        for (const table of schema) {
            // 한글 테이블명이 프롬프트에 포함되어 있는지 확인
            if (table.koreanName && prompt.includes(table.koreanName)) {
                this.logger.log(`Matched table by Korean name: ${table.name} (${table.koreanName})`);
                return table;
            }
        }

        // 3. 영어 테이블명 직접 매칭
        for (const table of schema) {
            if (lowerPrompt.includes(table.name.toLowerCase())) {
                this.logger.log(`Matched table by English name: ${table.name}`);
                return table;
            }
        }

        // 4. 컬럼 기반 매칭 (컬럼 한글명이 프롬프트에 있는 경우)
        for (const table of schema) {
            const hasMatchingColumn = table.columns.some(col => 
                prompt.includes(col.koreanName) || lowerPrompt.includes(col.name.toLowerCase())
            );
            if (hasMatchingColumn) {
                this.logger.log(`Matched table by column: ${table.name}`);
                return table;
            }
        }

        this.logger.warn(`No table match found for prompt: "${prompt}"`);
        return null;
    }

    /**
     * 컨텍스트 인식 SQL 생성
     */
    private generateContextAwareSql(
        prompt: string, 
        schema: Array<{
            name: string;
            koreanName: string;
            columns: Array<{ name: string; koreanName: string; type: string }>;
        }>
    ): string {
        const lowerPrompt = prompt.toLowerCase();
        
        // 테이블 매칭
        const matchedTable = this.findMatchingTable(prompt, schema);

        if (!matchedTable) {
            // 매칭 실패 시 사용 가능한 테이블 목록 표시
            const tableList = schema.slice(0, 10).map(t => `${t.name} (${t.koreanName})`).join(', ');
            return `-- ⚠️ 요청 "${prompt}"에 맞는 테이블을 찾지 못했습니다.\n-- 사용 가능한 테이블: ${tableList}\n\nSELECT '테이블을 지정해주세요' as message;`;
        }

        const tableName = matchedTable.name;
        const columns = matchedTable.columns;

        // 키워드 기반 쿼리 생성
        if (lowerPrompt.includes('count') || lowerPrompt.includes('개수') || lowerPrompt.includes('몇')) {
            return `-- ${matchedTable.koreanName} 개수 조회\nSELECT COUNT(*) as total_count FROM ${tableName};`;
        }

        if (lowerPrompt.includes('목록') || lowerPrompt.includes('list') || lowerPrompt.includes('조회')) {
            return `-- ${matchedTable.koreanName} 목록 조회\nSELECT *\nFROM ${tableName}\nLIMIT 100;`;
        }

        if (lowerPrompt.includes('최근') || lowerPrompt.includes('recent') || lowerPrompt.includes('latest')) {
            const dateCol = columns.find(c => 
                c.name.toLowerCase().includes('created') || c.name.toLowerCase().includes('date')
            )?.name || 'createdAt';
            return `-- ${matchedTable.koreanName} 최근 데이터\nSELECT *\nFROM ${tableName}\nORDER BY ${dateCol} DESC\nLIMIT 10;`;
        }

        if (lowerPrompt.includes('이번 주') || lowerPrompt.includes('지난 주') || lowerPrompt.includes('week') || lowerPrompt.includes('일주일')) {
            const dateCol = columns.find(c => 
                c.name.toLowerCase().includes('created') || c.name.toLowerCase().includes('date')
            )?.name || 'createdAt';
            return `-- ${matchedTable.koreanName} 최근 일주일 데이터\nSELECT *\nFROM ${tableName}\nWHERE ${dateCol} >= NOW() - INTERVAL '7 days'\nORDER BY ${dateCol} DESC\nLIMIT 100;`;
        }

        if (lowerPrompt.includes('이번 달') || lowerPrompt.includes('month')) {
            const dateCol = columns.find(c => 
                c.name.toLowerCase().includes('created') || c.name.toLowerCase().includes('date')
            )?.name || 'createdAt';
            return `-- ${matchedTable.koreanName} 이번 달 데이터\nSELECT *\nFROM ${tableName}\nWHERE ${dateCol} >= DATE_TRUNC('month', NOW())\nORDER BY ${dateCol} DESC\nLIMIT 100;`;
        }

        if (lowerPrompt.includes('통계') || lowerPrompt.includes('stats') || lowerPrompt.includes('summary')) {
            const numericCols = columns.filter(c => 
                ['int', 'integer', 'numeric', 'decimal', 'float', 'double', 'bigint'].some(t => 
                    c.type.toLowerCase().includes(t)
                )
            );
            if (numericCols.length > 0) {
                const col = numericCols[0].name;
                return `-- ${matchedTable.koreanName} 통계\nSELECT \n  COUNT(*) as total_count,\n  AVG(${col}) as avg_${col},\n  MAX(${col}) as max_${col},\n  MIN(${col}) as min_${col}\nFROM ${tableName};`;
            }
        }

        if (lowerPrompt.includes('그룹') || lowerPrompt.includes('group') || lowerPrompt.includes('별로')) {
            const groupCol = columns.find(c => 
                c.name.toLowerCase().includes('type') || c.name.toLowerCase().includes('status') || c.name.toLowerCase().includes('category')
            )?.name || columns[0]?.name || 'id';
            return `-- ${matchedTable.koreanName} 그룹별 통계\nSELECT ${groupCol}, COUNT(*) as count\nFROM ${tableName}\nGROUP BY ${groupCol}\nORDER BY count DESC;`;
        }

        // 기본: 전체 조회
        return `-- ${matchedTable.koreanName} 조회\nSELECT *\nFROM ${tableName}\nLIMIT 100;`;
    }
}
