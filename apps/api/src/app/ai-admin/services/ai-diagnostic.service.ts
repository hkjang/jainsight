import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { AiModelService } from './ai-model.service';
import { AiProvider } from '../entities/ai-provider.entity';

export interface TestResult {
    name: string;
    success: boolean;
    message: string;
    latencyMs: number;
    details?: any;
}

export interface DiagnosticResult {
    providerId: string;
    providerName: string;
    providerType: string;
    endpoint: string;
    timestamp: string;
    tests: TestResult[];
    summary: {
        passed: number;
        failed: number;
        totalLatencyMs: number;
        status: 'healthy' | 'degraded' | 'failed';
    };
    availableModels: string[];
}

@Injectable()
export class AiDiagnosticService {
    private readonly logger = new Logger(AiDiagnosticService.name);

    constructor(
        private readonly providerService: AiProviderService,
        private readonly modelService: AiModelService,
    ) {}

    /**
     * Run comprehensive diagnostics for a single provider
     */
    async diagnoseProvider(providerId: string): Promise<DiagnosticResult> {
        const provider = await this.providerService.findOne(providerId);
        const tests: TestResult[] = [];
        const availableModels: string[] = [];
        let totalLatencyMs = 0;

        this.logger.log(`Starting diagnostics for provider: ${provider.name}`);

        // Test 1: Connection Test
        const connectionTest = await this.testConnection(provider);
        tests.push(connectionTest);
        totalLatencyMs += connectionTest.latencyMs;

        // Only proceed with other tests if connection is successful
        if (connectionTest.success) {
            // Test 2: Model List Test
            const modelListTest = await this.testModelList(provider);
            tests.push(modelListTest);
            totalLatencyMs += modelListTest.latencyMs;
            
            if (modelListTest.success && modelListTest.details?.models) {
                availableModels.push(...modelListTest.details.models);
            }

            // Test 3: Chat Completion Test
            const chatTest = await this.testChatCompletion(provider, availableModels[0]);
            tests.push(chatTest);
            totalLatencyMs += chatTest.latencyMs;

            // Test 4: Streaming Test
            const streamTest = await this.testStreaming(provider, availableModels[0]);
            tests.push(streamTest);
            totalLatencyMs += streamTest.latencyMs;

            // Test 5: Token Generation Speed Test
            if (chatTest.success) {
                const speedTest = await this.testGenerationSpeed(provider, availableModels[0]);
                tests.push(speedTest);
                totalLatencyMs += speedTest.latencyMs;
            }
        }

        const passed = tests.filter(t => t.success).length;
        const failed = tests.filter(t => !t.success).length;

        // Determine overall status
        let status: 'healthy' | 'degraded' | 'failed';
        if (failed === 0) {
            status = 'healthy';
        } else if (passed > 0) {
            status = 'degraded';
        } else {
            status = 'failed';
        }

        return {
            providerId: provider.id,
            providerName: provider.name,
            providerType: provider.type,
            endpoint: provider.endpoint,
            timestamp: new Date().toISOString(),
            tests,
            summary: {
                passed,
                failed,
                totalLatencyMs,
                status,
            },
            availableModels,
        };
    }

    /**
     * Run diagnostics for all active providers
     */
    async diagnoseAllProviders(): Promise<DiagnosticResult[]> {
        const providers = await this.providerService.findActive();
        const results: DiagnosticResult[] = [];

        for (const provider of providers) {
            try {
                const result = await this.diagnoseProvider(provider.id);
                results.push(result);
            } catch (error) {
                this.logger.error(`Diagnostic failed for provider ${provider.name}: ${error.message}`);
                results.push({
                    providerId: provider.id,
                    providerName: provider.name,
                    providerType: provider.type,
                    endpoint: provider.endpoint,
                    timestamp: new Date().toISOString(),
                    tests: [{
                        name: 'Critical Error',
                        success: false,
                        message: error.message,
                        latencyMs: 0,
                    }],
                    summary: {
                        passed: 0,
                        failed: 1,
                        totalLatencyMs: 0,
                        status: 'failed',
                    },
                    availableModels: [],
                });
            }
        }

        return results;
    }

    /**
     * Quick health check for all providers
     */
    async healthCheck(): Promise<{ providers: Array<{ id: string; name: string; status: 'healthy' | 'unhealthy' }>; overallHealthy: boolean }> {
        const providers = await this.providerService.findActive();
        const results: Array<{ id: string; name: string; status: 'healthy' | 'unhealthy' }> = [];

        for (const provider of providers) {
            try {
                const testResult = await this.providerService.testConnection(provider.id);
                results.push({
                    id: provider.id,
                    name: provider.name,
                    status: testResult.success ? 'healthy' : 'unhealthy',
                });
            } catch {
                results.push({
                    id: provider.id,
                    name: provider.name,
                    status: 'unhealthy',
                });
            }
        }

        return {
            providers: results,
            overallHealthy: results.every(r => r.status === 'healthy'),
        };
    }

    // =========================================================================
    // Individual Test Methods
    // =========================================================================

    private async testConnection(provider: AiProvider): Promise<TestResult> {
        const startTime = Date.now();
        try {
            const client = this.providerService.createOpenAIClient(provider);
            
            // Simple ping to check if server is responding
            await client.models.list();
            
            return {
                name: '연결 테스트',
                success: true,
                message: '서버와 성공적으로 연결됨',
                latencyMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                name: '연결 테스트',
                success: false,
                message: `연결 실패: ${error.message}`,
                latencyMs: Date.now() - startTime,
            };
        }
    }

    private async testModelList(provider: AiProvider): Promise<TestResult> {
        const startTime = Date.now();
        try {
            const client = this.providerService.createOpenAIClient(provider);
            const response = await client.models.list();
            
            const models = Array.isArray(response.data) 
                ? response.data.map(m => m.id).slice(0, 20) 
                : [];
            
            return {
                name: '모델 목록 조회',
                success: true,
                message: `${models.length}개 모델 발견`,
                latencyMs: Date.now() - startTime,
                details: { models, count: models.length },
            };
        } catch (error) {
            return {
                name: '모델 목록 조회',
                success: false,
                message: `모델 목록 조회 실패: ${error.message}`,
                latencyMs: Date.now() - startTime,
            };
        }
    }

    private async testChatCompletion(provider: AiProvider, modelId?: string): Promise<TestResult> {
        const startTime = Date.now();
        
        // Get a valid model ID to test with
        const testModel = modelId || await this.getDefaultTestModel(provider);
        
        if (!testModel) {
            return {
                name: '채팅 완료 테스트',
                success: false,
                message: '테스트할 모델을 찾을 수 없음',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const client = this.providerService.createOpenAIClient(provider);
            const response = await client.chat.completions.create({
                model: testModel,
                messages: [
                    { role: 'user', content: 'Say "test successful" in exactly 2 words.' }
                ],
                max_tokens: 10,
                temperature: 0,
            });

            const content = response.choices[0]?.message?.content || '';
            const tokensUsed = response.usage?.total_tokens || 0;

            return {
                name: '채팅 완료 테스트',
                success: true,
                message: `응답 생성 성공 (${tokensUsed} tokens)`,
                latencyMs: Date.now() - startTime,
                details: { 
                    model: testModel, 
                    response: content.substring(0, 50),
                    tokensUsed,
                },
            };
        } catch (error) {
            return {
                name: '채팅 완료 테스트',
                success: false,
                message: `채팅 완료 실패: ${error.message}`,
                latencyMs: Date.now() - startTime,
                details: { model: testModel },
            };
        }
    }

    private async testStreaming(provider: AiProvider, modelId?: string): Promise<TestResult> {
        const startTime = Date.now();
        
        const testModel = modelId || await this.getDefaultTestModel(provider);
        
        if (!testModel) {
            return {
                name: '스트리밍 테스트',
                success: false,
                message: '테스트할 모델을 찾을 수 없음',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const client = this.providerService.createOpenAIClient(provider);
            const stream = await client.chat.completions.create({
                model: testModel,
                messages: [
                    { role: 'user', content: 'Count from 1 to 3.' }
                ],
                max_tokens: 20,
                stream: true,
            });

            let chunks = 0;
            let content = '';
            let firstChunkTime: number | null = null;

            for await (const chunk of stream) {
                if (!firstChunkTime) {
                    firstChunkTime = Date.now() - startTime;
                }
                chunks++;
                content += chunk.choices[0]?.delta?.content || '';
            }

            return {
                name: '스트리밍 테스트',
                success: true,
                message: `스트리밍 성공 (${chunks} chunks, 첫 응답 ${firstChunkTime}ms)`,
                latencyMs: Date.now() - startTime,
                details: { 
                    chunks, 
                    firstChunkLatencyMs: firstChunkTime,
                    response: content.substring(0, 50),
                },
            };
        } catch (error) {
            return {
                name: '스트리밍 테스트',
                success: false,
                message: `스트리밍 실패: ${error.message}`,
                latencyMs: Date.now() - startTime,
            };
        }
    }

    private async testGenerationSpeed(provider: AiProvider, modelId?: string): Promise<TestResult> {
        const startTime = Date.now();
        
        const testModel = modelId || await this.getDefaultTestModel(provider);
        
        if (!testModel) {
            return {
                name: '생성 속도 테스트',
                success: false,
                message: '테스트할 모델을 찾을 수 없음',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const client = this.providerService.createOpenAIClient(provider);
            
            // Generate a longer response to measure token generation speed
            const response = await client.chat.completions.create({
                model: testModel,
                messages: [
                    { role: 'user', content: 'List 10 random words, one per line.' }
                ],
                max_tokens: 100,
                temperature: 0.7,
            });

            const latencyMs = Date.now() - startTime;
            const outputTokens = response.usage?.completion_tokens || 0;
            const tokensPerSecond = outputTokens > 0 ? Math.round((outputTokens / latencyMs) * 1000) : 0;

            return {
                name: '생성 속도 테스트',
                success: true,
                message: `${tokensPerSecond} tokens/sec (${outputTokens} tokens in ${latencyMs}ms)`,
                latencyMs,
                details: {
                    outputTokens,
                    tokensPerSecond,
                    model: testModel,
                },
            };
        } catch (error) {
            return {
                name: '생성 속도 테스트',
                success: false,
                message: `속도 테스트 실패: ${error.message}`,
                latencyMs: Date.now() - startTime,
            };
        }
    }

    private async getDefaultTestModel(provider: AiProvider): Promise<string | null> {
        try {
            // First try to get a configured model for this provider
            const models = await this.modelService.findByProvider(provider.id);
            if (models.length > 0) {
                return models[0].modelId;
            }

            // Fallback to listing models from the provider
            const client = this.providerService.createOpenAIClient(provider);
            const response = await client.models.list();
            
            if (Array.isArray(response.data) && response.data.length > 0) {
                return response.data[0].id;
            }

            // Provider-specific defaults
            switch (provider.type) {
                case 'ollama':
                    return 'llama2';
                case 'vllm':
                    return 'default';
                case 'openai':
                    return 'gpt-3.5-turbo';
                default:
                    return null;
            }
        } catch {
            // Return provider-specific default on error
            switch (provider.type) {
                case 'ollama':
                    return 'llama2';
                case 'vllm':
                    return 'default';
                case 'openai':
                    return 'gpt-3.5-turbo';
                default:
                    return null;
            }
        }
    }
}
