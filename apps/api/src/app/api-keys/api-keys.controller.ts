
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsage } from './entities/api-key-usage.entity';

@Controller('api-keys')
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Get('user/:userId')
    async getApiKeys(@Param('userId') userId: string): Promise<ApiKey[]> {
        return this.apiKeysService.getApiKeys(userId);
    }

    @Get(':id')
    async getApiKeyById(@Param('id') id: string): Promise<ApiKey | null> {
        return this.apiKeysService.getApiKeyById(id);
    }

    @Post()
    async createApiKey(
        @Body() data: {
            userId: string;
            name: string;
            scopes?: string[];
            allowedIps?: string[];
            rateLimit?: number;
            expiresAt?: Date;
        }
    ): Promise<{ apiKey: ApiKey; rawKey: string }> {
        return this.apiKeysService.createApiKey(data);
    }

    @Put(':id')
    async updateApiKey(
        @Param('id') id: string,
        @Body() data: Partial<ApiKey>
    ): Promise<ApiKey | null> {
        return this.apiKeysService.updateApiKey(id, data);
    }

    @Post(':id/revoke')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeApiKey(
        @Param('id') id: string,
        @Body() data: { revokedBy: string; reason?: string }
    ): Promise<void> {
        return this.apiKeysService.revokeApiKey(id, data.revokedBy, data.reason);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteApiKey(@Param('id') id: string): Promise<void> {
        return this.apiKeysService.deleteApiKey(id);
    }

    // Usage endpoints
    @Get(':id/usage')
    async getUsage(
        @Param('id') id: string,
        @Query('limit') limit?: string
    ): Promise<ApiKeyUsage[]> {
        return this.apiKeysService.getUsage(id, limit ? parseInt(limit, 10) : undefined);
    }

    @Get(':id/stats')
    async getUsageStats(@Param('id') id: string): Promise<{
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        avgDuration: number;
    }> {
        return this.apiKeysService.getUsageStats(id);
    }

    // Validation endpoint (for internal use)
    @Post('validate')
    async validateApiKey(
        @Body() data: { key: string; queryId?: string; ip?: string }
    ): Promise<{ valid: boolean; apiKey?: ApiKey; error?: string }> {
        const apiKey = await this.apiKeysService.validateApiKey(data.key);
        
        if (!apiKey) {
            return { valid: false, error: 'Invalid or expired API key' };
        }

        if (data.ip && !(await this.apiKeysService.checkIpAllowed(apiKey, data.ip))) {
            return { valid: false, error: 'IP not allowed' };
        }

        if (data.queryId && !(await this.apiKeysService.checkScope(apiKey, data.queryId))) {
            return { valid: false, error: 'Query not in scope' };
        }

        return { valid: true, apiKey };
    }

    // Cleanup endpoint
    @Post('cleanup')
    async cleanupExpiredKeys(): Promise<{ cleanedCount: number }> {
        const count = await this.apiKeysService.cleanupExpiredKeys();
        return { cleanedCount: count };
    }
}
