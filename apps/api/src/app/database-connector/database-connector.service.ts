import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import * as mssql from 'mssql';
let Database: any;
try {
    Database = require('better-sqlite3');
} catch (e) {
    console.warn('Failed to load better-sqlite3 driver. SQLite features will be disabled.', e);
}
import { CreateConnectionDto } from '../connections/dto/create-connection.dto';
import { TableInfo, ColumnInfo } from './schema.interface';

export interface QueryResult {
    rows: any[];
    fields: string[];
    rowCount: number;
}

@Injectable()
export class DatabaseConnectorService implements OnModuleDestroy {
    private pools = new Map<string, any>();

    async onModuleDestroy() {
        for (const [key, pool] of this.pools.entries()) {
            try {
                if (pool.end) await pool.end(); // MySQL & PG
                else if (pool.close) await pool.close(); // MSSQL
            } catch (e) {
                console.error(`Failed to close pool ${key}`, e);
            }
        }
        this.pools.clear();
    }

    async testConnection(connDto: CreateConnectionDto): Promise<{ success: boolean; message: string }> {
        try {
            switch (connDto.type) {
                case 'mysql':
                case 'mariadb':
                    return await this.testMysql(connDto);
                case 'postgres':
                    return await this.testPostgres(connDto);
                case 'mssql':
                    return await this.testMssql(connDto);
                case 'sqlite':
                    return await this.testSqlite(connDto);
                default:
                    return { success: false, message: `Unsupported database type: ${connDto.type}` };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async executeQuery(connectionId: string, connDto: CreateConnectionDto, query: string): Promise<QueryResult> {
        try {
            switch (connDto.type) {
                case 'mysql':
                case 'mariadb':
                    return await this.executeMysqlQuery(connDto, query);
                case 'postgres':
                    return await this.executePostgresQuery(connDto, query);
                case 'mssql':
                    return await this.executeMssqlQuery(connDto, query);
                case 'sqlite':
                    return await this.executeSqliteQuery(connDto, query);
                default:
                    throw new Error(`Unsupported database type: ${connDto.type}`);
            }
        } catch (error) {
            const errorMsg = error.message || error.toString() || 'Unknown error';
            console.error(`[DatabaseConnector] Query execution failed for ${connDto.type}:`, errorMsg);
            throw new Error(`Query execution failed: ${errorMsg}`);
        }
    }

    async getTables(connDto: CreateConnectionDto): Promise<TableInfo[]> {
        switch (connDto.type) {
            case 'mysql':
            case 'mariadb':
                return this.getMysqlTables(connDto);
            case 'postgres':
                return this.getPostgresTables(connDto);
            case 'mssql':
                return this.getMssqlTables(connDto);
            case 'sqlite':
                return this.getSqliteTables(connDto);
            default:
                return [];
        }
    }

    async getColumns(connDto: CreateConnectionDto, tableName: string): Promise<ColumnInfo[]> {
        switch (connDto.type) {
            case 'mysql':
            case 'mariadb':
                return this.getMysqlColumns(connDto, tableName);
            case 'postgres':
                return this.getPostgresColumns(connDto, tableName);
            case 'mssql':
                return this.getMssqlColumns(connDto, tableName);
            case 'sqlite':
                return this.getSqliteColumns(connDto, tableName);
            default:
                return [];
        }
    }

    // --- MySQL Implementations ---

    private async testMysql(connDto: CreateConnectionDto): Promise<{ success: boolean; message: string }> {
        let connection;
        try {
            connection = await mysql.createConnection({
                host: connDto.host,
                port: connDto.port,
                user: connDto.username,
                password: connDto.password,
                database: connDto.database,
                connectTimeout: 5000,
            });
            await connection.ping();
            return { success: true, message: 'MySQL connection successful' };
        } catch (error) {
            return { success: false, message: `MySQL connection failed: ${error.message}` };
        } finally {
            if (connection) await connection.end();
        }
    }

    private async executeMysqlQuery(connDto: CreateConnectionDto, query: string): Promise<QueryResult> {
        // Generate a simplified key or use connection properties (in a real app, use the ID passed from service)
        // Since we don't have the ID strictly passed to this private method in the original code structure without refactoring everything,
        // we will rely on a hash or the host/user/db combo. 
        // BETTER: update the public interface to pass ID down, but for now let's construct a key.
        const poolKey = `mysql:${connDto.host}:${connDto.port}:${connDto.database}:${connDto.username}`;

        let pool = this.pools.get(poolKey);
        if (!pool) {
            pool = mysql.createPool({
                host: connDto.host,
                port: connDto.port,
                user: connDto.username,
                password: connDto.password,
                database: connDto.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            this.pools.set(poolKey, pool);
        }

        const [rows, fields] = await pool.execute(query);
        return {
            rows: Array.isArray(rows) ? rows : [],
            fields: Array.isArray(fields) ? fields.map((f: any) => f.name) : [],
            rowCount: Array.isArray(rows) ? rows.length : 0,
        };
    }

    private async getMysqlTables(connDto: CreateConnectionDto): Promise<TableInfo[]> {
        const query = `
        SELECT table_name as name, table_type as type 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `;
        const result = await this.executeMysqlQuery(connDto, mysql.format(query, [connDto.database]));
        return result.rows.map(row => ({
            name: row.name,
            type: row.type === 'VIEW' ? 'VIEW' : 'TABLE'
        }));
    }

    private async getMysqlColumns(connDto: CreateConnectionDto, tableName: string): Promise<ColumnInfo[]> {
        const query = `
            SELECT 
                column_name, 
                column_type,
                data_type, 
                is_nullable, 
                column_key,
                column_default,
                column_comment
            FROM information_schema.columns 
            WHERE table_schema = ? AND table_name = ?
            ORDER BY ordinal_position
        `;
        const result = await this.executeMysqlQuery(connDto, mysql.format(query, [connDto.database, tableName]));
        return result.rows.map(row => ({
            name: row.column_name,
            type: row.column_type || row.data_type, // column_type includes length (e.g., varchar(255))
            nullable: row.is_nullable === 'YES',
            primaryKey: row.column_key === 'PRI',
            defaultValue: row.column_default || undefined,
            comment: row.column_comment || undefined,
        }));
    }


    // --- PostgreSQL Implementations ---

    private async testPostgres(connDto: CreateConnectionDto): Promise<{ success: boolean; message: string }> {
        const pool = new PgPool({
            host: connDto.host,
            port: connDto.port,
            user: connDto.username,
            password: connDto.password,
            database: connDto.database,
            connectionTimeoutMillis: 5000,
        });

        try {
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            return { success: true, message: 'PostgreSQL connection successful' };
        } catch (error) {
            return { success: false, message: `PostgreSQL connection failed: ${error.message}` };
        } finally {
            await pool.end();
        }
    }

    private async executePostgresQuery(connDto: CreateConnectionDto, query: string): Promise<QueryResult> {
        const poolKey = `postgres:${connDto.host}:${connDto.port}:${connDto.database}:${connDto.username}`;

        let pool = this.pools.get(poolKey);
        if (!pool) {
            pool = new PgPool({
                host: connDto.host,
                port: connDto.port,
                user: connDto.username,
                password: connDto.password,
                database: connDto.database,
                max: 10, // Connection limit
                idleTimeoutMillis: 30000,
            });
            this.pools.set(poolKey, pool);
        }

        // Auto-quote mixed-case identifiers for PostgreSQL
        const processedQuery = this.autoQuotePostgresIdentifiers(query);
        
        const result = await pool.query(processedQuery);
        return {
            rows: result.rows,
            fields: result.fields.map(f => f.name),
            rowCount: result.rowCount || 0,
        };
    }

    /**
     * PostgreSQL에서 대소문자가 섞인 식별자(테이블명/컬럼명)를 자동으로 따옴표 처리
     * 예: CareerMovement -> "CareerMovement", startDate -> "startDate"
     */
    private autoQuotePostgresIdentifiers(query: string): string {
        // 이미 따옴표가 있으면 건드리지 않음
        if (query.includes('"')) {
            return query;
        }

        const sqlKeywords = new Set([
            'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'TRUE', 'FALSE',
            'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING', 'JOIN', 'LEFT',
            'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
            'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE',
            'INDEX', 'BETWEEN', 'LIKE', 'ILIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST',
            'COALESCE', 'NULLIF', 'EXISTS', 'UNION', 'ALL', 'EXCEPT', 'INTERSECT', 'WITH', 'RECURSIVE',
            'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'EXTRACT', 'DATE', 'TIME',
            'INTERVAL', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND'
        ]);

        // 정규식: PascalCase/camelCase 식별자 찾기
        return query.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, identifier) => {
            // 빈 문자열이거나 1자리면 스킵
            if (!identifier || identifier.length < 2) {
                return match;
            }
            
            // SQL 키워드는 스킵
            if (sqlKeywords.has(identifier.toUpperCase())) {
                return match;
            }
            
            // 숫자만 있거나 언더스코어만 있으면 스킵
            if (/^\d+$/.test(identifier) || /^_+$/.test(identifier)) {
                return match;
            }
            
            // 대소문자가 섞인 식별자만 따옴표 추가 (PascalCase 또는 camelCase)
            const hasMixedCase = /[a-z]/.test(identifier) && /[A-Z]/.test(identifier);
            if (hasMixedCase) {
                return `"${identifier}"`;
            }
            
            return match;
        });
    }

    private async getPostgresTables(connDto: CreateConnectionDto): Promise<TableInfo[]> {
        const query = `
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
        const result = await this.executePostgresQuery(connDto, query);
        return result.rows.map(row => ({
            name: row.table_name,
            type: row.table_type === 'VIEW' ? 'VIEW' : 'TABLE'
        }));
    }

    private async getPostgresColumns(connDto: CreateConnectionDto, tableName: string): Promise<ColumnInfo[]> {
        // PostgreSQL에서 대소문자 구분 테이블명 처리를 위해 파라미터화된 쿼리 사용
        // information_schema는 실제 테이블명을 그대로 저장하므로 직접 비교
        const query = `
            SELECT 
                c.column_name, 
                c.data_type, 
                c.is_nullable,
                c.column_default,
                CASE 
                    WHEN pk.column_name IS NOT NULL THEN true 
                    ELSE false 
                END as is_primary_key,
                pgd.description as column_comment
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT kcu.column_name, kcu.table_name, kcu.table_schema
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name 
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.column_name = pk.column_name 
                AND c.table_name = pk.table_name 
                AND c.table_schema = pk.table_schema
            LEFT JOIN pg_catalog.pg_statio_all_tables st 
                ON c.table_schema = st.schemaname AND c.table_name = st.relname
            LEFT JOIN pg_catalog.pg_description pgd 
                ON pgd.objoid = st.relid 
                AND pgd.objsubid = c.ordinal_position
            WHERE c.table_schema = 'public' AND c.table_name = $1
            ORDER BY c.ordinal_position
        `;
        
        // 파라미터화된 쿼리 실행
        const poolKey = `postgres:${connDto.host}:${connDto.port}:${connDto.database}:${connDto.username}`;
        let pool = this.pools.get(poolKey);
        if (!pool) {
            pool = new PgPool({
                host: connDto.host,
                port: connDto.port,
                user: connDto.username,
                password: connDto.password,
                database: connDto.database,
                max: 10,
                idleTimeoutMillis: 30000,
            });
            this.pools.set(poolKey, pool);
        }
        
        try {
            const result = await pool.query(query, [tableName]);
            return result.rows.map(row => ({
                name: row.column_name,
                type: row.data_type,
                nullable: row.is_nullable === 'YES',
                primaryKey: row.is_primary_key === true,
                defaultValue: row.column_default || undefined,
                comment: row.column_comment || undefined,
            }));
        } catch (error) {
            console.error(`[PostgreSQL] Failed to fetch columns for table ${tableName}:`, error.message);
            // 폴백: 기본 쿼리로 재시도
            const fallbackQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position
            `;
            const fallbackResult = await pool.query(fallbackQuery, [tableName]);
            return fallbackResult.rows.map(row => ({
                name: row.column_name,
                type: row.data_type,
                nullable: row.is_nullable === 'YES',
                primaryKey: false,
                defaultValue: row.column_default || undefined,
            }));
        }
    }


    // --- MSSQL Implementations ---

    private async testMssql(connDto: CreateConnectionDto): Promise<{ success: boolean; message: string }> {
        try {
            const pool = await mssql.connect({
                server: connDto.host,
                port: connDto.port,
                user: connDto.username,
                password: connDto.password,
                database: connDto.database,
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                },
                connectionTimeout: 5000,
            });
            await pool.request().query('SELECT 1');
            await pool.close();
            return { success: true, message: 'MSSQL connection successful' };
        } catch (error) {
            return { success: false, message: `MSSQL connection failed: ${error.message}` };
        }
    }

    private async executeMssqlQuery(connDto: CreateConnectionDto, query: string): Promise<QueryResult> {
        const poolKey = `mssql:${connDto.host}:${connDto.port}:${connDto.database}:${connDto.username}`;

        let pool = this.pools.get(poolKey);
        if (!pool) {
            pool = new mssql.ConnectionPool({
                server: connDto.host,
                port: connDto.port,
                user: connDto.username,
                password: connDto.password,
                database: connDto.database,
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                },
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            });
            await pool.connect();
            this.pools.set(poolKey, pool);
        }

        if (!pool.connected) {
            await pool.connect();
        }

        const result = await pool.request().query(query);
        return {
            rows: result.recordset,
            fields: result.recordset.columns ? Object.keys(result.recordset.columns) : [],
            rowCount: result.rowsAffected[0] || 0,
        };
    }

    private async getMssqlTables(connDto: CreateConnectionDto): Promise<TableInfo[]> {
        const query = `
        SELECT TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE' OR TABLE_TYPE = 'VIEW'
      `;
        const result = await this.executeMssqlQuery(connDto, query);
        return result.rows.map(row => ({
            name: row.TABLE_NAME,
            type: row.TABLE_TYPE === 'VIEW' ? 'VIEW' : 'TABLE'
        }));
    }

    private async getMssqlColumns(connDto: CreateConnectionDto, tableName: string): Promise<ColumnInfo[]> {
        // 스키마와 테이블명 분리 처리 (schema.tableName 형식 지원)
        let schemaName = 'dbo';
        let tblName = tableName;
        if (tableName.includes('.')) {
            const parts = tableName.split('.');
            schemaName = parts[0];
            tblName = parts[1];
        }
        
        const query = `
            SELECT 
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.IS_NULLABLE,
                c.COLUMN_DEFAULT,
                c.CHARACTER_MAXIMUM_LENGTH,
                CASE 
                    WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 
                    ELSE 0 
                END as IS_PRIMARY_KEY,
                sep.value as COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
                SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                    ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                    AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
                WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) pk ON c.TABLE_SCHEMA = pk.TABLE_SCHEMA 
                AND c.TABLE_NAME = pk.TABLE_NAME 
                AND c.COLUMN_NAME = pk.COLUMN_NAME
            LEFT JOIN sys.columns sc 
                ON OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)) = sc.object_id 
                AND c.COLUMN_NAME = sc.name
            LEFT JOIN sys.extended_properties sep 
                ON sep.major_id = sc.object_id 
                AND sep.minor_id = sc.column_id 
                AND sep.name = 'MS_Description'
            WHERE c.TABLE_SCHEMA = '${schemaName}' AND c.TABLE_NAME = '${tblName}'
            ORDER BY c.ORDINAL_POSITION
        `;
        
        try {
            const result = await this.executeMssqlQuery(connDto, query);
            return result.rows.map(row => ({
                name: row.COLUMN_NAME,
                type: row.CHARACTER_MAXIMUM_LENGTH 
                    ? `${row.DATA_TYPE}(${row.CHARACTER_MAXIMUM_LENGTH})` 
                    : row.DATA_TYPE,
                nullable: row.IS_NULLABLE === 'YES',
                primaryKey: row.IS_PRIMARY_KEY === 1,
                defaultValue: row.COLUMN_DEFAULT || undefined,
                comment: row.COLUMN_COMMENT || undefined,
            }));
        } catch (error) {
            console.error(`[MSSQL] Failed to fetch columns for table ${tableName}:`, error.message);
            // 폴백: 기본 쿼리로 재시도
            const fallbackQuery = `
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = '${schemaName}' AND TABLE_NAME = '${tblName}'
                ORDER BY ORDINAL_POSITION
            `;
            const fallbackResult = await this.executeMssqlQuery(connDto, fallbackQuery);
            return fallbackResult.rows.map(row => ({
                name: row.COLUMN_NAME,
                type: row.DATA_TYPE,
                nullable: row.IS_NULLABLE === 'YES',
                primaryKey: false,
                defaultValue: row.COLUMN_DEFAULT || undefined,
            }));
        }
    }

    // --- SQLite Implementations ---

    private async testSqlite(connDto: CreateConnectionDto): Promise<{ success: boolean; message: string }> {
        if (!Database) return { success: false, message: 'SQLite driver not loaded' };
        try {
            const db = new Database(connDto.database, { readonly: true });
            db.close();
            return { success: true, message: 'SQLite connection successful' };
        } catch (e) {
            return { success: false, message: `SQLite connection failed: ${e.message}` };
        }
    }

    private async executeSqliteQuery(connDto: CreateConnectionDto, query: string): Promise<QueryResult> {
        if (!Database) throw new Error('SQLite driver not loaded');
        let db;
        try {
            db = new Database(connDto.database);

            // better-sqlite3's .prepare().all() or .run()
            // Detect if SELECT (read) or Write
            const trimmed = query.trim().toUpperCase();
            let rows: any[] = [];
            let rowCount = 0;

            if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
                const stmt = db.prepare(query);
                rows = stmt.all();
                rowCount = rows.length;
            } else {
                const stmt = db.prepare(query);
                const info = stmt.run();
                rowCount = info.changes;
                rows = []; // Writes usually don't return rows unless RETURNING clause
            }

            // Infer fields from first row if possible
            const fields = rows.length > 0 ? Object.keys(rows[0]) : [];

            return {
                rows: rows,
                fields: fields,
                rowCount: rowCount
            };
        } catch (e) {
            throw new Error(`SQLite execution failed: ${e.message}`);
        } finally {
            if (db) db.close();
        }
    }

    private async getSqliteTables(connDto: CreateConnectionDto): Promise<TableInfo[]> {
        const query = `SELECT name, type FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
        const result = await this.executeSqliteQuery(connDto, query);
        return result.rows.map(row => ({
            name: row.name,
            type: 'TABLE'
        }));
    }

    private async getSqliteColumns(connDto: CreateConnectionDto, tableName: string): Promise<ColumnInfo[]> {
        // SQLite injection 방지를 위해 테이블명 검증
        const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const query = `PRAGMA table_info('${safeTableName}')`;
        const result = await this.executeSqliteQuery(connDto, query);
        // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        return result.rows.map(row => ({
            name: row.name,
            type: row.type || 'TEXT',
            nullable: row.notnull === 0,
            primaryKey: row.pk > 0,
            defaultValue: row.dflt_value || undefined,
        }));
    }
}

