
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
import { ApiKeysService } from '../api-keys/api-keys.service';
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
        private apiKeysService: ApiKeysService,
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

        // Security Check - Support both user API keys and legacy template keys
        if (apiKey) {
            // First try user API key (jai_xxx format)
            if (apiKey.startsWith('jai_')) {
                const validKey = await this.apiKeysService.validateApiKey(apiKey);
                if (!validKey) {
                    throw new Error('Invalid API Key');
                }
                // Optionally check scope for this template
                const hasScope = await this.apiKeysService.checkScope(validKey, templateId);
                if (!hasScope) {
                    throw new Error('API Key does not have access to this template');
                }
            } else {
                // Legacy: template-specific apiKey (deprecated)
                if (template.apiKey !== apiKey) {
                    throw new Error('Invalid API Key');
                }
                console.warn(`[SQL-API] Legacy template apiKey used for template ${templateId}. Please use user API keys instead.`);
            }
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
        const startTime = Date.now();
        
        try {
            // Binding
            const { sql } = this.bindParameters(template.sql, params);

            // Get Connection Config
            const connection = await this.connectionsService.getConnectionWithPassword(template.connectionId);
            if (!connection) throw new Error('Connection not found');

            // Execute with timeout if specified
            const connectionDto: any = { ...connection };
            const result = await this.databaseConnector.executeQuery(connection.id, connectionDto, sql);
            
            // Track success
            const latency = Date.now() - startTime;
            await this.updateAnalytics(template.id, true, latency);
            
            // Trigger webhook on success
            this.triggerWebhook(template, 'success', { params, result, latency });
            
            return result;
        } catch (error: any) {
            // Track error
            const latency = Date.now() - startTime;
            await this.updateAnalytics(template.id, false, latency, error.message);
            
            // Trigger webhook on error
            this.triggerWebhook(template, 'error', { params, error: error.message, latency });
            
            throw error;
        }
    }

    private async updateAnalytics(id: string, success: boolean, latency: number, errorMessage?: string) {
        const template = await this.findOne(id);
        if (!template) return;
        
        // Calculate new average latency
        const totalCalls = (template.successCount || 0) + (template.errorCount || 0);
        const currentAvg = template.avgLatency || 0;
        const newAvg = totalCalls > 0 
            ? ((currentAvg * totalCalls) + latency) / (totalCalls + 1)
            : latency;

        const updateData: Partial<SqlTemplate> = {
            avgLatency: Math.round(newAvg * 100) / 100,
        };

        if (success) {
            updateData.successCount = (template.successCount || 0) + 1;
        } else {
            updateData.errorCount = (template.errorCount || 0) + 1;
            updateData.lastErrorAt = new Date();
            updateData.lastErrorMessage = errorMessage?.substring(0, 500); // Limit error message length
        }

        await this.templateRepository.update(id, updateData);
    }

    private async triggerWebhook(template: SqlTemplate, event: 'success' | 'error', data: any) {
        if (!template.webhookUrl) return;
        
        const events = template.webhookEvents || [];
        if (!events.includes('all') && !events.includes(event)) return;
        
        try {
            // Fire and forget - don't block execution
            fetch(template.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event,
                    templateId: template.id,
                    templateName: template.name,
                    timestamp: new Date().toISOString(),
                    ...data,
                }),
            }).catch(err => console.warn('Webhook failed:', err.message));
        } catch (err) {
            console.warn('Webhook trigger error:', err);
        }
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
            
            // Directly insert value into SQL since our DB connector doesn't support parameterized queries
            if (val === undefined || val === null) {
                return 'NULL';
            }
            if (typeof val === 'number') {
                return String(val);
            }
            if (typeof val === 'boolean') {
                return val ? 'TRUE' : 'FALSE';
            }
            // String: escape single quotes by doubling them
            const escaped = String(val).replace(/'/g, "''");
            return `'${escaped}'`;
        });
        return { sql, values };
    }

    // === Enhanced Statistics & Analytics ===

    async getDetailedStatistics(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        const totalCalls = (template.successCount || 0) + (template.errorCount || 0);
        const successRate = totalCalls > 0 
            ? Math.round((template.successCount || 0) / totalCalls * 100) 
            : 0;

        return {
            id: template.id,
            name: template.name,
            usageCount: template.usageCount || 0,
            successCount: template.successCount || 0,
            errorCount: template.errorCount || 0,
            successRate,
            avgLatency: template.avgLatency || 0,
            lastUsedAt: template.lastUsedAt,
            lastErrorAt: template.lastErrorAt,
            lastErrorMessage: template.lastErrorMessage,
            createdAt: template.createdAt,
            isActive: template.isActive,
            isDeprecated: !!template.deprecatedAt,
            deprecatedAt: template.deprecatedAt,
            deprecatedMessage: template.deprecatedMessage,
            version: template.version,
            cacheTtl: template.cacheTtl,
            rateLimit: template.rateLimit,
            tags: template.tags || [],
        };
    }

    // === Bulk Operations ===

    async bulkToggleActive(ids: string[], active: boolean) {
        const results: { id: string; success: boolean; message?: string }[] = [];
        
        for (const id of ids) {
            try {
                await this.templateRepository.update(id, { isActive: active });
                results.push({ id, success: true });
            } catch (error: any) {
                results.push({ id, success: false, message: error.message });
            }
        }
        
        return {
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        };
    }

    async bulkDelete(ids: string[]) {
        const results: { id: string; success: boolean; message?: string }[] = [];
        
        for (const id of ids) {
            try {
                await this.templateRepository.delete(id);
                results.push({ id, success: true });
            } catch (error: any) {
                results.push({ id, success: false, message: error.message });
            }
        }
        
        return {
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        };
    }

    // === Tags & Search ===

    async getAllTags(): Promise<string[]> {
        const templates = await this.templateRepository.find();
        const allTags = new Set<string>();
        
        templates.forEach(t => {
            (t.tags || []).forEach(tag => allTags.add(tag));
        });
        
        return Array.from(allTags).sort();
    }

    async searchApis(query: string, filters: {
        tags?: string[];
        isActive?: boolean;
        isDeprecated?: boolean;
    } = {}) {
        let templates = await this.templateRepository.find();
        
        // Text search
        if (query) {
            const lowerQuery = query.toLowerCase();
            templates = templates.filter(t => 
                t.name.toLowerCase().includes(lowerQuery) ||
                t.description?.toLowerCase().includes(lowerQuery) ||
                t.sql.toLowerCase().includes(lowerQuery)
            );
        }
        
        // Tag filter
        if (filters.tags && filters.tags.length > 0) {
            templates = templates.filter(t => 
                filters.tags!.some(tag => (t.tags || []).includes(tag))
            );
        }
        
        // Active filter
        if (filters.isActive !== undefined) {
            templates = templates.filter(t => t.isActive === filters.isActive);
        }
        
        // Deprecation filter
        if (filters.isDeprecated !== undefined) {
            templates = templates.filter(t => 
                filters.isDeprecated ? !!t.deprecatedAt : !t.deprecatedAt
            );
        }
        
        return templates;
    }

    // === Deprecation ===

    async deprecate(id: string, message?: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        await this.templateRepository.update(id, {
            deprecatedAt: new Date(),
            deprecatedMessage: message || 'This API has been deprecated',
        });

        return { 
            success: true, 
            message: 'API marked as deprecated',
            deprecatedAt: new Date(),
        };
    }

    async undeprecate(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        await this.templateRepository.update(id, {
            deprecatedAt: null as any,
            deprecatedMessage: null as any,
        });

        return { success: true, message: 'API deprecation removed' };
    }

    // === Webhook Management ===

    async updateWebhook(id: string, data: { 
        webhookUrl?: string; 
        webhookEvents?: ('success' | 'error' | 'all')[];
    }) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        await this.templateRepository.update(id, {
            webhookUrl: data.webhookUrl,
            webhookEvents: data.webhookEvents,
        });

        return { success: true, message: 'Webhook settings updated' };
    }

    async testWebhook(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');
        if (!template.webhookUrl) throw new Error('No webhook URL configured');

        try {
            const response = await fetch(template.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'test',
                    templateId: template.id,
                    templateName: template.name,
                    timestamp: new Date().toISOString(),
                    message: 'This is a test webhook from Jainsight',
                }),
            });

            return { 
                success: response.ok, 
                status: response.status,
                message: response.ok ? 'Webhook test successful' : 'Webhook test failed',
            };
        } catch (error: any) {
            return { 
                success: false, 
                message: `Webhook test failed: ${error.message}`,
            };
        }
    }

    // === Health Check ===

    async healthCheck(id: string) {
        const template = await this.findOne(id);
        if (!template) throw new Error('Template not found');

        const startTime = Date.now();
        
        try {
            // Check if connection is available
            const connection = await this.connectionsService.getConnectionWithPassword(template.connectionId);
            if (!connection) {
                return {
                    healthy: false,
                    connectionStatus: 'not_found',
                    latency: Date.now() - startTime,
                    message: 'Database connection not found',
                };
            }

            // Try a simple validation (not actual execution)
            return {
                healthy: true,
                connectionStatus: 'connected',
                latency: Date.now() - startTime,
                isActive: template.isActive,
                isDeprecated: !!template.deprecatedAt,
                message: template.isActive ? 'API is healthy and active' : 'API is healthy but inactive',
            };
        } catch (error: any) {
            return {
                healthy: false,
                connectionStatus: 'error',
                latency: Date.now() - startTime,
                message: error.message,
            };
        }
    }

    // === Import/Export ===

    async exportApis(ids: string[]) {
        const templates = await this.templateRepository.find();
        const toExport = ids.length > 0 
            ? templates.filter(t => ids.includes(t.id))
            : templates;

        return toExport.map(t => ({
            name: t.name,
            description: t.description,
            sql: t.sql,
            parameters: t.parameters,
            config: t.config,
            visualization: t.visualization,
            cacheTtl: t.cacheTtl,
            rateLimit: t.rateLimit,
            method: t.method,
            tags: t.tags,
            timeout: t.timeout,
            allowedOrigins: t.allowedOrigins,
            // Exclude: id, apiKey, connectionId, usage stats, timestamps
        }));
    }

    async importApis(apis: any[], connectionId: string, ownerId?: string) {
        const results: { name: string; success: boolean; id?: string; error?: string }[] = [];

        for (const api of apis) {
            try {
                const created = await this.create({
                    ...api,
                    connectionId,
                    ownerId,
                    isActive: false, // Start inactive for safety
                });
                results.push({ name: api.name, success: true, id: created.id });
            } catch (error: any) {
                results.push({ name: api.name, success: false, error: error.message });
            }
        }

        return {
            imported: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        };
    }
}
