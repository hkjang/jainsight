
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, Req } from '@nestjs/common';
import { SqlApiService } from './sql-api.service';
import { SqlApiDocService } from './sql-api-doc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { Throttle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sql-api')
export class SqlApiController {
    constructor(
        private readonly sqlApiService: SqlApiService,
        private readonly docService: SqlApiDocService
    ) { }

    @Post()
    @Roles('admin')
    create(@Body() body: any) {
        return this.sqlApiService.create(body);
    }

    @Get()
    findAll() {
        return this.sqlApiService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const template = await this.sqlApiService.findOne(id);
        if (!template) throw new NotFoundException('Template not found');
        return template;
    }

    @Put(':id')
    @Roles('admin')
    async update(@Param('id') id: string, @Body() body: any) {
        const template = await this.sqlApiService.findOne(id);
        if (!template) throw new NotFoundException('Template not found');
        return this.sqlApiService.update(id, body);
    }

    @Delete(':id')
    @Roles('admin')
    async delete(@Param('id') id: string) {
        const template = await this.sqlApiService.findOne(id);
        if (!template) throw new NotFoundException('Template not found');
        return this.sqlApiService.delete(id);
    }

    @Get(':id/openapi')
    async getOpenApi(@Param('id') id: string) {
        const template = await this.sqlApiService.findOne(id);
        if (!template) throw new NotFoundException('Template not found');
        return this.docService.generateOpenApiSpec(template);
    }

    @Post('execute')
    @UseGuards(JwtAuthGuard) // Internal execution (e.g. Test button)
    executeInternal(@Body() body: { templateId: string; params: any }) {
        return this.sqlApiService.execute(body.templateId, body.params);
    }

    // Public API execution - uses API key authentication instead of JWT
    @Post('execute/:templateId')
    @Public()
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async executePublic(@Param('templateId') templateId: string, @Body() body: { apiKey: string; params: any }) {
        return this.sqlApiService.execute(templateId, body.params, body.apiKey);
    }

    // Alternative execute endpoint pattern (supports /:id/execute URL) - also public
    @Post(':id/execute')
    @Public()
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async executeAlternative(@Param('id') id: string, @Body() body: { apiKey: string; params: any }) {
        return this.sqlApiService.execute(id, body.params, body.apiKey);
    }

    // === New Enhanced Endpoints ===

    @Get(':id/stats')
    async getStatistics(@Param('id') id: string) {
        return this.sqlApiService.getStatistics(id);
    }

    @Post(':id/toggle')
    @Roles('admin')
    async toggleActive(@Param('id') id: string) {
        return this.sqlApiService.toggleActive(id);
    }

    @Post(':id/test')
    async testExecute(@Param('id') id: string, @Body() body: { params: Record<string, any> }) {
        return this.sqlApiService.testExecute(id, body.params || {});
    }

    @Post(':id/duplicate')
    @Roles('admin')
    async duplicate(@Param('id') id: string) {
        return this.sqlApiService.duplicate(id);
    }

    @Post(':id/regenerate-key')
    @Roles('admin')
    async regenerateApiKey(@Param('id') id: string) {
        return this.sqlApiService.regenerateApiKey(id);
    }

    @Post('seed')
    @Roles('admin')
    async seed() {
        return this.sqlApiService.seed();
    }

    // === RBAC Sharing Endpoints ===

    @Post(':id/share')
    async updateSharing(
        @Param('id') id: string,
        @Body() body: { visibility: 'private' | 'group' | 'public'; sharedWithGroups?: string[] },
        @Req() req: any
    ) {
        const userId = req.user?.userId || req.user?.sub || req.user?.id;
        return this.sqlApiService.updateSharing(id, body, userId);
    }

    // Get APIs for current user (RBAC filtered)
    @Get('my/list')
    async getMyApis(@Req() req: any) {
        const userId = req.user?.userId || req.user?.sub || req.user?.id;
        const userGroups = req.user?.groups || [];
        return this.sqlApiService.findAllForUser(userId, userGroups);
    }
}

