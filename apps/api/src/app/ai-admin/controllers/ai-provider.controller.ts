import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AiProviderService } from '../services/ai-provider.service';
import { CreateAiProviderDto, UpdateAiProviderDto } from '../dto/ai-provider.dto';

@Controller('admin/ai-providers')
export class AiProviderController {
    constructor(private readonly providerService: AiProviderService) {}

    @Get()
    async findAll() {
        return this.providerService.findAll();
    }

    @Get('active')
    async findActive() {
        return this.providerService.findActive();
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
}
