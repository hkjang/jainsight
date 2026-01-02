
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, NotFoundException, Req } from '@nestjs/common';
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

    @Get('tags')
    async getAllTags() {
        return this.sqlApiService.getAllTags();
    }

    @Get('by-group/:groupId')
    async getApisByGroup(@Param('groupId') groupId: string) {
        return this.sqlApiService.getApisByGroup(groupId);
    }

    @Get('search')
    async searchApis(
        @Query('q') query: string,
        @Query('tags') tags?: string,
        @Query('isActive') isActive?: string,
        @Query('isDeprecated') isDeprecated?: string
    ) {
        const filters = {
            tags: tags ? tags.split(',') : undefined,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            isDeprecated: isDeprecated !== undefined ? isDeprecated === 'true' : undefined,
        };
        return this.sqlApiService.searchApis(query || '', filters);
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

    @Get(':id/postman')
    async getPostmanCollection(@Param('id') id: string) {
        const template = await this.sqlApiService.findOne(id);
        if (!template) throw new NotFoundException('Template not found');
        return this.docService.generatePostmanCollection(template);
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

    // === Statistics & Analytics ===

    @Get(':id/stats')
    async getStatistics(@Param('id') id: string) {
        return this.sqlApiService.getStatistics(id);
    }

    @Get(':id/stats/detailed')
    async getDetailedStatistics(@Param('id') id: string) {
        return this.sqlApiService.getDetailedStatistics(id);
    }

    @Get(':id/health')
    async healthCheck(@Param('id') id: string) {
        return this.sqlApiService.healthCheck(id);
    }

    // === API Management ===

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

    // === Bulk Operations ===

    @Post('bulk/toggle')
    @Roles('admin')
    async bulkToggleActive(@Body() body: { ids: string[]; active: boolean }) {
        return this.sqlApiService.bulkToggleActive(body.ids, body.active);
    }

    @Delete('bulk')
    @Roles('admin')
    async bulkDelete(@Body() body: { ids: string[] }) {
        return this.sqlApiService.bulkDelete(body.ids);
    }

    // === Deprecation ===

    @Post(':id/deprecate')
    @Roles('admin')
    async deprecate(@Param('id') id: string, @Body() body: { message?: string }) {
        return this.sqlApiService.deprecate(id, body.message);
    }

    @Post(':id/undeprecate')
    @Roles('admin')
    async undeprecate(@Param('id') id: string) {
        return this.sqlApiService.undeprecate(id);
    }

    // === Webhook Management ===

    @Put(':id/webhook')
    @Roles('admin')
    async updateWebhook(
        @Param('id') id: string,
        @Body() body: { webhookUrl?: string; webhookEvents?: ('success' | 'error' | 'all')[] }
    ) {
        return this.sqlApiService.updateWebhook(id, body);
    }

    @Post(':id/webhook/test')
    @Roles('admin')
    async testWebhook(@Param('id') id: string) {
        return this.sqlApiService.testWebhook(id);
    }

    // === Import/Export ===

    @Post('export')
    async exportApis(@Body() body: { ids?: string[] }) {
        return this.sqlApiService.exportApis(body.ids || []);
    }

    @Post('import')
    @Roles('admin')
    async importApis(
        @Body() body: { apis: any[]; connectionId: string },
        @Req() req: any
    ) {
        const userId = req.user?.userId || req.user?.sub || req.user?.id;
        return this.sqlApiService.importApis(body.apis, body.connectionId, userId);
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
