import { Injectable, Logger } from '@nestjs/common';
import { AiModel, ModelPurpose } from '../entities/ai-model.entity';
import { AiModelService } from './ai-model.service';
import { AiProviderService } from './ai-provider.service';

export interface RoutingContext {
    purpose?: ModelPurpose;
    dbType?: string; // 'oracle' | 'mysql' | 'postgresql' | 'sqlite' | 'mssql'
    userGroup?: string;
    preferredProviderId?: string;
}

export interface RoutedModel {
    model: AiModel;
    reason: string;
}

@Injectable()
export class ModelRouterService {
    private readonly logger = new Logger(ModelRouterService.name);

    constructor(
        private readonly modelService: AiModelService,
        private readonly providerService: AiProviderService,
    ) {}

    async selectModel(context: RoutingContext): Promise<RoutedModel | null> {
        const { purpose, dbType, preferredProviderId } = context;

        // Get all active models with their providers
        let models = await this.modelService.findActive();

        if (models.length === 0) {
            this.logger.warn('No active models found');
            return null;
        }

        // Filter by purpose if specified
        if (purpose) {
            const purposeFiltered = models.filter(m => m.purpose === purpose || m.purpose === 'general');
            if (purposeFiltered.length > 0) {
                models = purposeFiltered;
            }
        }

        // Filter by preferred provider if specified
        if (preferredProviderId) {
            const providerFiltered = models.filter(m => m.providerId === preferredProviderId);
            if (providerFiltered.length > 0) {
                models = providerFiltered;
            }
        }

        // Filter by active providers only
        const activeProviders = await this.providerService.findActive();
        const activeProviderIds = new Set(activeProviders.map(p => p.id));
        models = models.filter(m => activeProviderIds.has(m.providerId));

        if (models.length === 0) {
            this.logger.warn('No models with active providers found');
            return null;
        }

        // Sort by provider priority
        models.sort((a, b) => {
            const priorityA = a.provider?.priority || 999;
            const priorityB = b.provider?.priority || 999;
            return priorityA - priorityB;
        });

        const selectedModel = models[0];
        const reason = this.buildRoutingReason(selectedModel, context);

        this.logger.log(`Selected model: ${selectedModel.name} (${selectedModel.modelId}) - ${reason}`);

        return {
            model: selectedModel,
            reason,
        };
    }

    async selectWithFailover(context: RoutingContext): Promise<RoutedModel | null> {
        const activeProviders = await this.providerService.findActive();
        
        // Sort by priority
        activeProviders.sort((a, b) => a.priority - b.priority);

        for (const provider of activeProviders) {
            try {
                // Test connection first
                const testResult = await this.providerService.testConnection(provider.id);
                
                if (testResult.success) {
                    return this.selectModel({
                        ...context,
                        preferredProviderId: provider.id,
                    });
                } else {
                    this.logger.warn(`Provider ${provider.name} is not available: ${testResult.message}`);
                }
            } catch (error) {
                this.logger.error(`Provider ${provider.name} health check failed: ${error.message}`);
            }
        }

        this.logger.error('All providers are unavailable');
        return null;
    }

    private buildRoutingReason(model: AiModel, context: RoutingContext): string {
        const reasons: string[] = [];

        if (context.purpose) {
            reasons.push(`purpose=${context.purpose}`);
        }
        if (context.dbType) {
            reasons.push(`dbType=${context.dbType}`);
        }
        if (context.preferredProviderId) {
            reasons.push(`preferredProvider`);
        }

        reasons.push(`provider_priority=${model.provider?.priority || 'default'}`);

        return reasons.join(', ');
    }
}
