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
        SELECT column_name, data_type, is_nullable, column_key
        FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `;
        const result = await this.executeMysqlQuery(connDto, mysql.format(query, [connDto.database, tableName]));
        return result.rows.map(row => ({
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            primaryKey: row.column_key === 'PRI'
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
        // 이미 따옴표가 있는 식별자는 건드리지 않음
        // PascalCase 또는 camelCase 패턴 감지 (대문자가 포함된 비-키워드)
        const sqlKeywords = new Set([
            'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'TRUE', 'FALSE',
            'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING', 'JOIN', 'LEFT',
            'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
            'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE',
            'INDEX', 'BETWEEN', 'LIKE', 'ILIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST',
            'COALESCE', 'NULLIF', 'EXISTS', 'UNION', 'ALL', 'EXCEPT', 'INTERSECT', 'WITH', 'RECURSIVE'
        ]);

        // 정규식: 따옴표 밖에서 PascalCase/camelCase 식별자 찾기
        // 예: CareerMovement, startDate, userId 등
        return query.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, identifier) => {
            // 이미 따옴표로 감싸진 경우 스킵
            // SQL 키워드는 스킵
            if (sqlKeywords.has(identifier.toUpperCase())) {
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
        const query = `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `;
        // Note: rudimentary SQL injection protection needed for production
        const result = await this.executePostgresQuery(connDto, query);
        return result.rows.map(row => ({
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            primaryKey: false // TODO: fetch PK info separately
        }));
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
        const query = `
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `;
        const result = await this.executeMssqlQuery(connDto, query);
        return result.rows.map(row => ({
            name: row.COLUMN_NAME,
            type: row.DATA_TYPE,
            nullable: row.IS_NULLABLE === 'YES',
            primaryKey: false
        }));
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
        const query = `PRAGMA table_info('${tableName}')`;
        const result = await this.executeSqliteQuery(connDto, query);
        // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        return result.rows.map(row => ({
            name: row.name,
            type: row.type,
            nullable: row.notnull === 0,
            primaryKey: row.pk > 0
        }));
    }
}

