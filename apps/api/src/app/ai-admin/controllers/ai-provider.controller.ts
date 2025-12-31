import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AiProviderService } from '../services/ai-provider.service';
import { AiDiagnosticService } from '../services/ai-diagnostic.service';
import { CreateAiProviderDto, UpdateAiProviderDto } from '../dto/ai-provider.dto';

@Controller('admin/ai-providers')
export class AiProviderController {
    constructor(
        private readonly providerService: AiProviderService,
        private readonly diagnosticService: AiDiagnosticService,
    ) {}

    @Get()
    async findAll() {
        return this.providerService.findAll();
    }

    @Get('active')
    async findActive() {
        return this.providerService.findActive();
    }

    @Get('health')
    async healthCheck() {
        return this.diagnosticService.healthCheck();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.providerService.findOne(id);
    }

    @Post()
    async create(@Body() dto: CreateAiProviderDto) {
        return this.providerService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateAiProviderDto) {
        return this.providerService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string) {
        await this.providerService.remove(id);
    }

    @Post(':id/test')
    async testConnection(@Param('id') id: string) {
        return this.providerService.testConnection(id);
    }

    /**
     * Run comprehensive diagnostic tests for a single provider
     */
    @Post(':id/diagnose')
    async diagnoseProvider(@Param('id') id: string) {
        return this.diagnosticService.diagnoseProvider(id);
    }

    /**
     * Run comprehensive diagnostic tests for all active providers
     */
    @Post('diagnose-all')
    async diagnoseAllProviders() {
        return this.diagnosticService.diagnoseAllProviders();
    }
}

