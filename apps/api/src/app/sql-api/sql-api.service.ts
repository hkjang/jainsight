
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SqlTemplate } from './entities/sql-template.entity';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnectorService } from '../database-connector/database-connector.service';
import { ConnectionsService } from '../connections/connections.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Connection } from '../connections/entities/connection.entity';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SqlApiService implements OnModuleInit {
    constructor(
        @InjectRepository(SqlTemplate)
        private templateRepository: Repository<SqlTemplate>,
        @InjectRepository(Connection)
        private connectionRepository: Repository<Connection>, // Inject Connection Repo
        @InjectRepository(User)
        private userRepository: Repository<User>, // Inject User Repo
        private databaseConnector: DatabaseConnectorService,
        private connectionsService: ConnectionsService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    async onModuleInit() {
        try {
            await this.seed();
        } catch (error) {
            console.warn('Seeding failed (non-fatal):', error);
        }
    }

    async create(createDto: Partial<SqlTemplate>) {
        // Auto-detect parameters if not provided, or validate them
        const detectedParams = this.extractParameters(createDto.sql || '');

        // Merge with provided config or invoke defaults
        const finalParams = detectedParams.map(p => {
            const existing = createDto.parameters?.find(ep => ep.name === p);
            return existing || { name: p, type: 'string', required: true };
        });

        const template = this.templateRepository.create({
            ...createDto,
            parameters: finalParams as any,
            apiKey: uuidv4(), // Generate secure key
        });
        return this.templateRepository.save(template);
    }

    async seed() {
        console.log('Seed: Starting...');
        try {
            // Seed User
            console.log('Seed: Checking User...');
            let user = await this.userRepository.findOne({ where: { email: 'admin@example.com' } });
            if (!user) {
                console.log('Seed: Creating User...');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                user = await this.userRepository.save({
                    email: 'admin@example.com',
                    name: 'Admin User',
                    password: hashedPassword,
                    role: 'admin'
                });
            } else {
                console.log('Seed: User already exists');
            }

            // Seed Connection
            console.log('Seed: Checking Connection...');
            let conn = await this.connectionRepository.findOne({ where: { name: 'Demo DB' } });
            if (!conn) {
                console.log('Seed: Creating Connection...');
                conn = await this.connectionRepository.save({
                    name: 'Demo DB',
                    type: 'sqlite',
                    host: 'localhost',
                    port: 0,
                    username: '',
                    password: '',
                    database: 'jainsight.db'
                });
            } else {
                console.log('Seed: Connection already exists');
            }

            // Seed Template
            console.log('Seed: Checking Template...');
            const tpl = await this.templateRepository.findOne({ where: { name: 'Get All Users' } });
            if (!tpl && conn) {
                console.log('Seed: Creating Template...');
                await this.create({
                    name: 'Get All Users',
                    sql: 'SELECT id, name, email, role FROM user',
                    connectionId: conn.id,
                    visualization: { type: 'bar', xAxis: 'name', dataKeys: ['id'] } as any
                });
            } else {
                console.log('Seed: Template already exists or Connection missing');
            }

            console.log('Seed: Completed Successfully');
            return { message: 'Seeded successfully', user: 'admin', connection: 'Demo DB' };
        } catch (e) {
            console.error('Seed: Error encountered', e);
            throw e;
        }
    }

    async findAll() {
        return this.templateRepository.find();
    }

    // RBAC-aware findAll - returns APIs user can access
    async findAllForUser(userId: string, userGroups: string[] = []) {
        const allTemplates = await this.templateRepository.find();
        
        return allTemplates.filter(template => {
            // Owner can always see their own APIs
            if (template.ownerId === userId) return true;
            if (template.createdBy === userId) return true;
            
            // Public APIs are visible to all
            if (template.visibility === 'public') return true;
            
            // Group-shared APIs: check if user is in any of the shared groups
            if (template.visibility === 'group' && template.sharedWithGroups) {
                return template.sharedWithGroups.some(groupId => userGroups.includes(groupId));
            }
            
            // Private APIs: only owner can see
            return false;
        });
    }

    // Update API sharing settings
    async updateSharing(id: string, data: { 
        visibility: 'private' | 'group' | 'public';
        sharedWithGroups?: string[];
    }, userId: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');
        
        // Only owner can update sharing
        if (template.ownerId !== userId && template.createdBy !== userId) {
            throw new Error('Only the owner can update sharing settings');
        }
        
        await this.templateRepository.update(id, {
            visibility: data.visibility,
            sharedWithGroups: data.sharedWithGroups || [],
        });
        
        return this.findOne(id);
    }

    async findOne(id: string) {
        return this.templateRepository.findOne({ where: { id } });
    }

    async update(id: string, updateDto: Partial<SqlTemplate>) {
        // If SQL is updated, re-extract parameters
        if (updateDto.sql) {
            const detectedParams = this.extractParameters(updateDto.sql);
            const finalParams = detectedParams.map(p => {
                const existing = updateDto.parameters?.find(ep => ep.name === p);
                return existing || { name: p, type: 'string', required: true };
            });
            updateDto.parameters = finalParams as any;
        }

        await this.templateRepository.update(id, updateDto);
        return this.findOne(id);
    }

    async delete(id: string) {
        const result = await this.templateRepository.delete(id);
        return { deleted: result.affected > 0 };
    }

    async execute(templateId: string, params: Record<string, any>, apiKey?: string) {
        const template = await this.findOne(templateId);
        if (!template) throw new Error('Template not found');

        // Check if API is active
        if (!template.isActive) {
            throw new Error('API is currently disabled');
        }

        // Security Check
        if (apiKey && template.apiKey !== apiKey) {
            throw new Error('Invalid API Key');
        }

        // Validation
        if (template.parameters) {
            for (const pDefinition of template.parameters) {
                const val = params[pDefinition.name];
                if (pDefinition.required && (val === undefined || val === null)) {
                    throw new Error(`Missing required parameter: ${pDefinition.name}`);
                }
                // Simple type check
                if (val !== undefined && pDefinition.type === 'number' && typeof val !== 'number') {
                    if (isNaN(Number(val))) throw new Error(`Invalid type for ${pDefinition.name}, expected number`);
                }
            }
        }

        // Track usage
        await this.templateRepository.update(templateId, {
            usageCount: () => 'usageCount + 1',
            lastUsedAt: new Date(),
        });

        // Caching Logic
        if (template.cacheTtl && template.cacheTtl > 0) {
            // Create stable key based on parameters
            const sortedParams = Object.keys(params || {}).sort().reduce((acc: any, key) => {
                acc[key] = params[key];
                return acc;
            }, {});
            const cacheKey = `sql-api:${templateId}:${JSON.stringify(sortedParams)}`;

            const cachedResult = await this.cacheManager.get(cacheKey);
            if (cachedResult) {
                return cachedResult; // Cache Hit
            }

            // Proceed to execute (logic duplicated below to allow setting cache)
            const result = await this.performExecution(template, params);

            // Set Cache
            await this.cacheManager.set(cacheKey, result, template.cacheTtl * 1000);
            return result;
        }

        return this.performExecution(template, params);
    }

    private async performExecution(template: SqlTemplate, params: Record<string, any>) {
        // Binding
        const { sql } = this.bindParameters(template.sql, params);

        // Get Connection Config
        const connection = await this.connectionsService.getConnectionWithPassword(template.connectionId);
        if (!connection) throw new Error('Connection not found');

        // Execute
        const connectionDto: any = { ...connection };
        return this.databaseConnector.executeQuery(connection.id, connectionDto, sql);
    }

    // === New Enhanced Methods ===

    async getStatistics(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        return {
            id: template.id,
            name: template.name,
            usageCount: template.usageCount || 0,
            lastUsedAt: template.lastUsedAt,
            createdAt: template.createdAt,
            isActive: template.isActive,
            version: template.version,
            cacheTtl: template.cacheTtl,
            rateLimit: template.rateLimit,
        };
    }

    async regenerateApiKey(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        const newApiKey = uuidv4();
        await this.templateRepository.update(id, { apiKey: newApiKey });

        return { 
            success: true, 
            apiKey: newApiKey,
            message: 'API key regenerated successfully' 
        };
    }

    async toggleActive(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        const newStatus = !template.isActive;
        await this.templateRepository.update(id, { isActive: newStatus });

        return { 
            success: true, 
            isActive: newStatus,
            message: `API ${newStatus ? 'activated' : 'deactivated'} successfully` 
        };
    }

    async testExecute(id: string, params: Record<string, any>) {
        const startTime = Date.now();
        
        try {
            const result = await this.execute(id, params);
            const duration = Date.now() - startTime;
            
            return {
                success: true,
                data: result,
                duration,
                rowCount: Array.isArray(result) ? result.length : 1,
            };
        } catch (error: any) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                error: error.message,
                duration,
            };
        }
    }

    async duplicate(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        const newTemplate = this.templateRepository.create({
            name: `${template.name} (Copy)`,
            description: template.description,
            sql: template.sql,
            parameters: template.parameters,
            connectionId: template.connectionId,
            config: template.config,
            visualization: template.visualization,
            cacheTtl: template.cacheTtl,
            rateLimit: template.rateLimit,
            method: template.method,
            apiKey: uuidv4(),
            isActive: false,
            version: 1,
            usageCount: 0,
        });

        return this.templateRepository.save(newTemplate);
    }

    private extractParameters(sql: string): string[] {
        const regex = /:(\w+)/g;
        const matches = new Set<string>();
        let match;
        while ((match = regex.exec(sql)) !== null) {
            matches.add(match[1]);
        }
        return Array.from(matches);
    }

    private bindParameters(originalSql: string, params: Record<string, any>): { sql: string, values: any[] } {
        const values: any[] = [];
        const sql = originalSql.replace(/:(\w+)/g, (match, paramName) => {
            const val = params[paramName];
            values.push(val);
            return '?'; // Default to '?' binding - In a real app, this depends on DB type
        });
        return { sql, values };
    }
}

