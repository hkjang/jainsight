import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { AiProvider } from '../entities/ai-provider.entity';
import { CreateAiProviderDto, UpdateAiProviderDto } from '../dto/ai-provider.dto';

@Injectable()
export class AiProviderService {
    constructor(
        @InjectRepository(AiProvider)
        private readonly providerRepo: Repository<AiProvider>,
    ) {}

    async findAll(): Promise<AiProvider[]> {
        return this.providerRepo.find({
            order: { priority: 'ASC', createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<AiProvider> {
        const provider = await this.providerRepo.findOne({ where: { id } });
        if (!provider) {
            throw new NotFoundException(`AI Provider with id ${id} not found`);
        }
        return provider;
    }

    async findActive(): Promise<AiProvider[]> {
        return this.providerRepo.find({
            where: { isActive: true },
            order: { priority: 'ASC' },
        });
    }

    async create(dto: CreateAiProviderDto): Promise<AiProvider> {
        const provider = this.providerRepo.create(dto);
        return this.providerRepo.save(provider);
    }

    async update(id: string, dto: UpdateAiProviderDto): Promise<AiProvider> {
        const provider = await this.findOne(id);
        Object.assign(provider, dto);
        return this.providerRepo.save(provider);
    }

    async remove(id: string): Promise<void> {
        const provider = await this.findOne(id);
        await this.providerRepo.remove(provider);
    }

    async testConnection(id: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
        const provider = await this.findOne(id);
        const startTime = Date.now();

        try {
            const client = this.createOpenAIClient(provider);
            
            // Try to list models or make a simple completion request
            if (provider.type === 'ollama' || provider.type === 'vllm') {
                // For Ollama and vLLM, try listing models first
                try {
                    const models = await client.models.list();
                    const latencyMs = Date.now() - startTime;
                    return {
                        success: true,
                        message: `Connection successful. Found ${Array.isArray(models.data) ? models.data.length : 0} models.`,
                        latencyMs,
                    };
                } catch (listError) {
                    // Fallback: try a simple chat completion for Ollama
                    if (provider.type === 'ollama') {
                        const response = await client.chat.completions.create({
                            model: 'llama2',
                            messages: [{ role: 'user', content: 'ping' }],
                            max_tokens: 1,
                        });
                        
                        const latencyMs = Date.now() - startTime;
                        return {
                            success: true,
                            message: 'Connection successful',
                            latencyMs,
                        };
                    }
                    throw listError;
                }
            } else {
                // For OpenAI, try listing models
                const models = await client.models.list();
                const latencyMs = Date.now() - startTime;
                
                return {
                    success: true,
                    message: `Connection successful. Found ${Array.isArray(models.data) ? models.data.length : 0} models.`,
                    latencyMs,
                };
            }
        } catch (error) {
            const latencyMs = Date.now() - startTime;
            return {
                success: false,
                message: `Connection failed: ${error.message}`,
                latencyMs,
            };
        }
    }

    createOpenAIClient(provider: AiProvider): OpenAI {
        let baseURL = provider.endpoint;
        
        // Normalize endpoint for Ollama and vLLM (OpenAI compatible APIs)
        // Both typically serve the OpenAI-compatible API at the /v1 path
        if ((provider.type === 'ollama' || provider.type === 'vllm') && !baseURL.includes('/v1')) {
            baseURL = baseURL.replace(/\/$/, '') + '/v1';
        }

        return new OpenAI({
            apiKey: provider.apiKey || 'dummy-key', // Ollama/vLLM don't always need a real key
            baseURL,
            timeout: provider.timeoutMs,
            maxRetries: provider.retryCount,
        });
    }
}

