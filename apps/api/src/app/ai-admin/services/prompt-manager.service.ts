import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptTemplate, PromptPurpose } from '../entities/prompt-template.entity';
import { CreatePromptTemplateDto, UpdatePromptTemplateDto } from '../dto/prompt-template.dto';

export interface PromptVariables {
    schema?: string;
    tables?: string;
    columns?: string;
    userQuery?: string;
    dbType?: string;
    examples?: string;
    [key: string]: string | undefined;
}

@Injectable()
export class PromptManagerService {
    constructor(
        @InjectRepository(PromptTemplate)
        private readonly templateRepo: Repository<PromptTemplate>,
    ) {}

    async findAll(): Promise<PromptTemplate[]> {
        return this.templateRepo.find({
            order: { name: 'ASC', version: 'DESC' },
        });
    }

    async findOne(id: string): Promise<PromptTemplate> {
        const template = await this.templateRepo.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException(`Prompt template with id ${id} not found`);
        }
        return template;
    }

    async findByPurpose(purpose: PromptPurpose): Promise<PromptTemplate[]> {
        return this.templateRepo.find({
            where: { purpose, isActive: true, isApproved: true },
            order: { version: 'DESC' },
        });
    }

    async findLatestActive(purpose: PromptPurpose): Promise<PromptTemplate | null> {
        const templates = await this.findByPurpose(purpose);
        return templates.length > 0 ? templates[0] : null;
    }

    async getVersionHistory(name: string): Promise<PromptTemplate[]> {
        return this.templateRepo.find({
            where: { name },
            order: { version: 'DESC' },
        });
    }

    async create(dto: CreatePromptTemplateDto): Promise<PromptTemplate> {
        const template = this.templateRepo.create({
            ...dto,
            variables: dto.variables ? JSON.stringify(dto.variables) : null,
            version: 1,
        });
        return this.templateRepo.save(template);
    }

    async update(id: string, dto: UpdatePromptTemplateDto): Promise<PromptTemplate> {
        const existing = await this.findOne(id);
        
        // Create a new version instead of updating in place
        const newVersion = this.templateRepo.create({
            name: existing.name,
            content: dto.content || existing.content,
            variables: dto.variables ? JSON.stringify(dto.variables) : existing.variables,
            purpose: existing.purpose,
            isActive: dto.isActive ?? true,
            isApproved: false, // New version needs approval
            parentId: existing.id,
            version: existing.version + 1,
            description: dto.description || existing.description,
        });

        // Deactivate old version
        existing.isActive = false;
        await this.templateRepo.save(existing);

        return this.templateRepo.save(newVersion);
    }

    async approve(id: string, approvedBy: string): Promise<PromptTemplate> {
        const template = await this.findOne(id);
        template.isApproved = true;
        template.approvedBy = approvedBy;
        template.approvedAt = new Date();
        return this.templateRepo.save(template);
    }

    async remove(id: string): Promise<void> {
        const template = await this.findOne(id);
        await this.templateRepo.remove(template);
    }

    renderPrompt(template: PromptTemplate, variables: PromptVariables): string {
        let content = template.content;

        // Replace all {{variable}} patterns
        for (const [key, value] of Object.entries(variables)) {
            if (value !== undefined) {
                const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                content = content.replace(pattern, value);
            }
        }

        return content;
    }

    getDefaultNl2SqlPrompt(): string {
        return `You are an expert SQL query generator. Given a natural language question and database schema information, generate a valid SQL query.

## Database Schema
{{schema}}

## User Question
{{userQuery}}

## Instructions
1. Generate ONLY the SQL query, no explanations
2. Use proper table and column names from the schema
3. Add appropriate LIMIT clause for large result sets
4. Use prepared statement placeholders ($1, $2, etc.) for user inputs if needed
5. Optimize for performance

## Generated SQL:`;
    }
}
