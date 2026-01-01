
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

    /**
     * 쿼리명과 설명을 AI 기반으로 자동 생성
     */
    async generateQueryName(connectionId: string, query: string): Promise<{ name: string; description: string }> {
        try {
            const upperQuery = query.toUpperCase();
            
            // SQL에서 테이블명 추출
            const tableMatch = query.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
            const tableName = tableMatch ? tableMatch[1] : '';
            
            // 쿼리 타입 확인
            let queryType = '조회';
            if (upperQuery.startsWith('INSERT')) queryType = '삽입';
            else if (upperQuery.startsWith('UPDATE')) queryType = '수정';
            else if (upperQuery.startsWith('DELETE')) queryType = '삭제';
            else if (upperQuery.includes('COUNT(')) queryType = '개수 조회';
            else if (upperQuery.includes('GROUP BY')) queryType = '그룹별 통계';
            else if (upperQuery.includes('ORDER BY') && upperQuery.includes('DESC')) queryType = '최신순 조회';
            else if (upperQuery.includes('SUM(') || upperQuery.includes('AVG(')) queryType = '통계';
            else if (upperQuery.includes('JOIN')) queryType = '연관 조회';
            
            // 특수 조건 확인
            let condition = '';
            if (upperQuery.includes('WHERE')) {
                if (upperQuery.includes('LIKE')) condition = ' (검색)';
                else if (upperQuery.includes('BETWEEN')) condition = ' (기간)';
                else if (upperQuery.includes('IN (')) condition = ' (목록)';
                else condition = ' (조건)';
            }
            
            // 제한 조건 확인
            const limitMatch = query.match(/LIMIT\s+(\d+)/i);
            const limitInfo = limitMatch && parseInt(limitMatch[1]) < 100 ? ` TOP ${limitMatch[1]}` : '';
            
            // 한글 테이블명 변환
            const koreanTableName = translateTableName(tableName) || tableName;
            
            // 이름 생성
            const name = tableName 
                ? `${koreanTableName} ${queryType}${condition}${limitInfo}`.trim()
                : `쿼리 ${new Date().toLocaleDateString('ko-KR')}`;
            
            // 설명 생성
            const lines = query.trim().split('\n').filter(l => !l.trim().startsWith('--'));
            const description = `${queryType} 쿼리${tableName ? ` - ${tableName} 테이블` : ''}. ` +
                `${lines.length > 3 ? `${lines.length}줄 쿼리.` : ''} ` +
                (upperQuery.includes('JOIN') ? '조인 포함. ' : '') +
                (upperQuery.includes('WHERE') ? '조건 필터 적용. ' : '');
            
            return { name: name.substring(0, 100), description: description.trim() };
        } catch (error) {
            this.logger.error('Failed to generate query name', error);
            return { name: `쿼리 ${new Date().toLocaleDateString('ko-KR')}`, description: '' };
        }
    }

    /**
     * SQL 오류 분석 및 수정 제안
     */
    async analyzeError(connectionId: string, query: string, errorMessage: string): Promise<{ cause: string; solution: string; correctedQuery?: string }> {
        try {
            const lowerError = errorMessage.toLowerCase();
            
            // 컬럼 관련 오류
            if (lowerError.includes('column') && lowerError.includes('does not exist')) {
                const columnMatch = errorMessage.match(/column\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i);
                const columnName = columnMatch ? columnMatch[1] : '알 수 없음';
                return {
                    cause: `컬럼 "${columnName}"이(가) 존재하지 않습니다.`,
                    solution: '스키마 브라우저에서 정확한 컬럼명을 확인하세요. 대소문자 구분에 주의하세요.',
                };
            }
            
            // 테이블 관련 오류
            if (lowerError.includes('relation') && lowerError.includes('does not exist')) {
                const tableMatch = errorMessage.match(/relation\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i);
                const tableName = tableMatch ? tableMatch[1] : '알 수 없음';
                return {
                    cause: `테이블 "${tableName}"이(가) 존재하지 않습니다.`,
                    solution: '스키마 브라우저에서 정확한 테이블명을 확인하세요. 스키마명(예: public.)이 필요할 수 있습니다.',
                };
            }
            
            // 문법 오류
            if (lowerError.includes('syntax error')) {
                const nearMatch = errorMessage.match(/near\s+"?([^"]+)"?/i) || errorMessage.match(/at or near\s+"?([^"]+)"?/i);
                const nearText = nearMatch ? nearMatch[1] : '';
                return {
                    cause: `SQL 문법 오류${nearText ? `: "${nearText}" 근처` : ''}`,
                    solution: '괄호, 쉼표, 따옴표가 올바르게 짝이 맞는지 확인하세요. SQL 키워드 철자를 확인하세요.',
                };
            }
            
            // 권한 오류
            if (lowerError.includes('permission denied')) {
                return {
                    cause: '해당 테이블/작업에 대한 권한이 없습니다.',
                    solution: '데이터베이스 관리자에게 권한을 요청하세요.',
                };
            }
            
            // 연결 오류
            if (lowerError.includes('connection') || lowerError.includes('timeout')) {
                return {
                    cause: '데이터베이스 연결 문제가 발생했습니다.',
                    solution: '네트워크 연결을 확인하고, 연결 설정을 다시 테스트해보세요.',
                };
            }
            
            // 타입 오류
            if (lowerError.includes('type') && (lowerError.includes('mismatch') || lowerError.includes('cannot'))) {
                return {
                    cause: '데이터 타입이 일치하지 않습니다.',
                    solution: 'CAST()나 ::type을 사용하여 타입을 변환하세요. 예: CAST(column AS INTEGER)',
                };
            }
            
            // 기본 응답
            return {
                cause: errorMessage,
                solution: '쿼리를 다시 확인하고, 스키마 브라우저에서 테이블과 컬럼 정보를 확인해보세요.',
            };
        } catch (error) {
            this.logger.error('Failed to analyze error', error);
            return {
                cause: errorMessage,
                solution: '오류를 분석할 수 없습니다. 쿼리를 다시 확인해주세요.',
            };
        }
    }
}
