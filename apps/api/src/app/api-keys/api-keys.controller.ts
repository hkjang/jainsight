
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyUsage } from './entities/api-key-usage.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api-keys')
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    // ======== Personal API Key Endpoints (for logged-in users) ========

    @Get('my')
    @UseGuards(JwtAuthGuard)
    async getMyApiKeys(@Req() req: any): Promise<ApiKey[]> {
        const userId = req.user?.userId || req.user?.sub || req.user?.id;
        return this.apiKeysService.getUserApiKeys(userId, 'user');
    }

    @Post('my')
    @UseGuards(JwtAuthGuard)
    async createMyApiKey(
        @Req() req: any,
        @Body() data: { name: string; scopes?: string[]; rateLimit?: number; expiresAt?: Date }
    ): Promise<{ apiKey: ApiKey; rawKey: string }> {
        const userId = req.user?.userId || req.user?.sub || req.user?.id;
        return this.apiKeysService.createApiKey({
            userId,
            name: data.name,
            type: 'user',
            scopes: data.scopes || ['sql-api:*'],
            rateLimit: data.rateLimit || 60,
            expiresAt: data.expiresAt,
        });
    }

    @Delete('my/:id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMyApiKey(@Req() req: any, @Param('id') id: string): Promise<void> {
        const userId = req.user?.userId || req.user?.sub || req.user?.id;
        // Verify ownership before deleting
        const key = await this.apiKeysService.getApiKeyById(id);
        if (key && key.userId === userId && key.type === 'user') {
            return this.apiKeysService.deleteApiKey(id);
        }
        throw new Error('API key not found or not owned by user');
    }

    // ======== Admin/General Endpoints ========

    @Get()
    async getAllApiKeys(): Promise<ApiKey[]> {
        return this.apiKeysService.getAllApiKeys();
    }

    @Get('stats')
    async getOverallStats(): Promise<{
        totalKeys: number;
        activeKeys: number;
        expiredKeys: number;
        revokedKeys: number;
        totalCalls: number;
    }> {
        return this.apiKeysService.getOverallStats();
    }

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
            type?: 'admin' | 'user';
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
