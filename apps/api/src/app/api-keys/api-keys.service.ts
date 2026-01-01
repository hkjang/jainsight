
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsage } from './entities/api-key-usage.entity';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
    constructor(
        @InjectRepository(ApiKey)
        private apiKeysRepository: Repository<ApiKey>,
        @InjectRepository(ApiKeyUsage)
        private usageRepository: Repository<ApiKeyUsage>,
    ) { }

    // Key Generation
    async createApiKey(data: {
        userId: string;
        name: string;
        type?: 'admin' | 'user';
        scopes?: string[];
        allowedIps?: string[];
        rateLimit?: number;
        expiresAt?: Date;
    }): Promise<{ apiKey: ApiKey; rawKey: string }> {
        // Generate random key
        const rawKey = `jai_${randomBytes(32).toString('hex')}`;
        const keyHash = await bcrypt.hash(rawKey, 10);
        const keyPrefix = rawKey.substring(0, 12) + '...';

        const apiKey = this.apiKeysRepository.create({
            userId: data.userId,
            name: data.name,
            type: data.type || 'user',
            keyHash,
            keyPrefix,
            scopes: data.scopes || ['sql-api:*'],
            allowedIps: data.allowedIps,
            rateLimit: data.rateLimit || 60,
            expiresAt: data.expiresAt
        });

        const saved = await this.apiKeysRepository.save(apiKey);
        return { apiKey: saved, rawKey };
    }

    // Key Validation
    async validateApiKey(rawKey: string): Promise<ApiKey | null> {
        const apiKeys = await this.apiKeysRepository.find({ where: { isActive: true } });
        
        for (const apiKey of apiKeys) {
            const isMatch = await bcrypt.compare(rawKey, apiKey.keyHash);
            if (isMatch) {
                // Check expiry
                if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
                    return null;
                }
                
                // Update last used
                await this.apiKeysRepository.update(apiKey.id, { 
                    lastUsedAt: new Date(),
                    usageCount: apiKey.usageCount + 1
                });
                
                return apiKey;
            }
        }
        
        return null;
    }

    async checkScope(apiKey: ApiKey, queryId?: string): Promise<boolean> {
        if (!apiKey.scopes || apiKey.scopes.length === 0) return true;
        
        for (const scope of apiKey.scopes) {
            if (scope === 'query:*') return true;
            if (queryId && scope === `query:${queryId}`) return true;
        }
        
        return false;
    }

    async checkIpAllowed(apiKey: ApiKey, ip: string): Promise<boolean> {
        if (!apiKey.allowedIps || apiKey.allowedIps.length === 0) return true;
        return apiKey.allowedIps.includes(ip);
    }

    // Get all API keys (for admin)
    async getAllApiKeys(): Promise<ApiKey[]> {
        return this.apiKeysRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    // Get overall stats
    async getOverallStats(): Promise<{
        totalKeys: number;
        activeKeys: number;
        expiredKeys: number;
        revokedKeys: number;
        totalCalls: number;
    }> {
        const allKeys = await this.apiKeysRepository.find();
        const now = new Date();
        
        const totalKeys = allKeys.length;
        const activeKeys = allKeys.filter(k => k.isActive && (!k.expiresAt || new Date(k.expiresAt) > now)).length;
        const expiredKeys = allKeys.filter(k => k.expiresAt && new Date(k.expiresAt) <= now).length;
        const revokedKeys = allKeys.filter(k => !k.isActive && k.revokedAt).length;
        const totalCalls = allKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

        return { totalKeys, activeKeys, expiredKeys, revokedKeys, totalCalls };
    }

    // Key Management
    async getApiKeys(userId: string): Promise<ApiKey[]> {
        return this.apiKeysRepository.find({ 
            where: { userId },
            order: { createdAt: 'DESC' }
        });
    }

    // Get user's personal API keys (type = 'user')
    async getUserApiKeys(userId: string, type: 'admin' | 'user' = 'user'): Promise<ApiKey[]> {
        return this.apiKeysRepository.find({ 
            where: { userId, type },
            order: { createdAt: 'DESC' }
        });
    }

    async getApiKeyById(id: string): Promise<ApiKey | null> {
        return this.apiKeysRepository.findOne({ where: { id } });
    }

    async updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey | null> {
        await this.apiKeysRepository.update(id, data);
        return this.getApiKeyById(id);
    }

    async revokeApiKey(id: string, revokedBy: string, reason?: string): Promise<void> {
        await this.apiKeysRepository.update(id, {
            isActive: false,
            revokedAt: new Date(),
            revokedBy,
            revokeReason: reason
        });
    }

    async deleteApiKey(id: string): Promise<void> {
        await this.usageRepository.delete({ apiKeyId: id });
        await this.apiKeysRepository.delete(id);
    }

    // Usage Tracking
    async logUsage(data: Partial<ApiKeyUsage>): Promise<ApiKeyUsage> {
        const usage = this.usageRepository.create(data);
        return this.usageRepository.save(usage);
    }

    async getUsage(apiKeyId: string, limit = 100): Promise<ApiKeyUsage[]> {
        return this.usageRepository.find({
            where: { apiKeyId },
            order: { calledAt: 'DESC' },
            take: limit
        });
    }

    async getUsageStats(apiKeyId: string): Promise<{
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        avgDuration: number;
    }> {
        const usage = await this.usageRepository.find({ where: { apiKeyId } });
        const totalCalls = usage.length;
        const successfulCalls = usage.filter(u => u.statusCode && u.statusCode < 400).length;
        const failedCalls = totalCalls - successfulCalls;
        const avgDuration = totalCalls > 0
            ? usage.reduce((sum, u) => sum + (u.durationMs || 0), 0) / totalCalls
            : 0;

        return { totalCalls, successfulCalls, failedCalls, avgDuration };
    }

    // Cleanup expired keys
    async cleanupExpiredKeys(): Promise<number> {
        const result = await this.apiKeysRepository.update(
            { 
                isActive: true, 
                expiresAt: LessThan(new Date())
            },
            { isActive: false }
        );
        return result.affected || 0;
    }
}
