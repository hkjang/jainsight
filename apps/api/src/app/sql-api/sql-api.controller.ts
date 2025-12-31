
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { SqlApiService } from './sql-api.service';
import { SqlApiDocService } from './sql-api-doc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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

    @Post('execute/:templateId')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async executePublic(@Param('templateId') templateId: string, @Body() body: { apiKey: string; params: any }) {
        return this.sqlApiService.execute(templateId, body.params, body.apiKey);
    }

    @Post('seed')
    @Roles('admin')
    async seed() {
        return this.sqlApiService.seed();
    }
}
