import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AiModelService } from '../services/ai-model.service';
import { CreateAiModelDto, UpdateAiModelDto } from '../dto/ai-model.dto';
import { ModelPurpose } from '../entities/ai-model.entity';

@Controller('admin/ai-models')
export class AiModelController {
    constructor(private readonly modelService: AiModelService) {}

    @Get()
    async findAll() {
        return this.modelService.findAll();
    }

    @Get('active')
    async findActive() {
        return this.modelService.findActive();
    }

    @Get('by-purpose/:purpose')
    async findByPurpose(@Param('purpose') purpose: ModelPurpose) {
        return this.modelService.findByPurpose(purpose);
    }

    @Get('by-provider/:providerId')
    async findByProvider(@Param('providerId') providerId: string) {
        return this.modelService.findByProvider(providerId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.modelService.findOne(id);
    }

    @Post()
    async create(@Body() dto: CreateAiModelDto) {
        return this.modelService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateAiModelDto) {
        return this.modelService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string) {
        await this.modelService.remove(id);
    }

    @Post(':id/test')
    async testModel(@Param('id') id: string, @Body() body?: { prompt?: string }) {
        return this.modelService.testModel(id, body?.prompt);
    }
}
