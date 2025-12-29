import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiModel, ModelPurpose } from '../entities/ai-model.entity';
import { CreateAiModelDto, UpdateAiModelDto } from '../dto/ai-model.dto';
import { AiProviderService } from './ai-provider.service';

@Injectable()
export class AiModelService {
    constructor(
        @InjectRepository(AiModel)
        private readonly modelRepo: Repository<AiModel>,
        private readonly providerService: AiProviderService,
    ) {}

    async findAll(): Promise<AiModel[]> {
        return this.modelRepo.find({
            relations: ['provider'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<AiModel> {
        const model = await this.modelRepo.findOne({
            where: { id },
            relations: ['provider'],
        });
        if (!model) {
            throw new NotFoundException(`AI Model with id ${id} not found`);
        }
        return model;
    }

    async findByProvider(providerId: string): Promise<AiModel[]> {
        return this.modelRepo.find({
            where: { providerId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByPurpose(purpose: ModelPurpose): Promise<AiModel[]> {
        return this.modelRepo.find({
            where: { purpose, isActive: true },
            relations: ['provider'],
            order: { createdAt: 'DESC' },
        });
    }

    async findActive(): Promise<AiModel[]> {
        return this.modelRepo.find({
            where: { isActive: true },
            relations: ['provider'],
        });
    }

    async create(dto: CreateAiModelDto): Promise<AiModel> {
        // Verify provider exists
        await this.providerService.findOne(dto.providerId);
        
        const model = this.modelRepo.create(dto);
        return this.modelRepo.save(model);
    }

    async update(id: string, dto: UpdateAiModelDto): Promise<AiModel> {
        const model = await this.findOne(id);
        Object.assign(model, dto);
        return this.modelRepo.save(model);
    }

    async remove(id: string): Promise<void> {
        const model = await this.findOne(id);
        await this.modelRepo.remove(model);
    }

    async testModel(id: string, testPrompt?: string): Promise<{ success: boolean; response?: string; latencyMs: number; tokens?: { input: number; output: number } }> {
        const model = await this.findOne(id);
        const startTime = Date.now();

        try {
            const client = this.providerService.createOpenAIClient(model.provider);
            
            const prompt = testPrompt || 'SELECT 1';
            const response = await client.chat.completions.create({
                model: model.modelId,
                messages: [
                    ...(model.systemPrompt ? [{ role: 'system' as const, content: model.systemPrompt }] : []),
                    { role: 'user' as const, content: prompt },
                ],
                max_tokens: model.maxTokens,
                temperature: model.temperature,
                top_p: model.topP,
            });

            const latencyMs = Date.now() - startTime;
            return {
                success: true,
                response: response.choices[0]?.message?.content || '',
                latencyMs,
                tokens: {
                    input: response.usage?.prompt_tokens || 0,
                    output: response.usage?.completion_tokens || 0,
                },
            };
        } catch (error) {
            const latencyMs = Date.now() - startTime;
            return {
                success: false,
                response: error.message,
                latencyMs,
            };
        }
    }
}
