import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { PromptManagerService } from '../services/prompt-manager.service';
import { CreatePromptTemplateDto, UpdatePromptTemplateDto, TestPromptDto } from '../dto/prompt-template.dto';
import { PromptPurpose } from '../entities/prompt-template.entity';

@Controller('admin/prompts')
export class PromptController {
    constructor(private readonly promptService: PromptManagerService) {}

    @Get()
    async findAll() {
        return this.promptService.findAll();
    }

    @Get('by-purpose/:purpose')
    async findByPurpose(@Param('purpose') purpose: PromptPurpose) {
        return this.promptService.findByPurpose(purpose);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.promptService.findOne(id);
    }

    @Get(':name/versions')
    async getVersionHistory(@Param('name') name: string) {
        return this.promptService.getVersionHistory(name);
    }

    @Post()
    async create(@Body() dto: CreatePromptTemplateDto) {
        return this.promptService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdatePromptTemplateDto) {
        return this.promptService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string) {
        await this.promptService.remove(id);
    }

    @Post(':id/approve')
    async approve(@Param('id') id: string, @Body() body: { approvedBy: string }) {
        return this.promptService.approve(id, body.approvedBy);
    }

    @Post('test')
    async testPrompt(@Body() dto: TestPromptDto) {
        const template = {
            content: dto.content,
        } as any;
        
        const rendered = this.promptService.renderPrompt(template, {
            schema: dto.schema || '(no schema provided)',
            userQuery: dto.userQuery || '(no query provided)',
        });

        return { rendered };
    }

    @Get('default/nl2sql')
    async getDefaultNl2SqlPrompt() {
        return { content: this.promptService.getDefaultNl2SqlPrompt() };
    }
}
