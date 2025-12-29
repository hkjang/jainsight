import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AiExecutionLog } from '../entities/ai-execution-log.entity';
import { AiProvider } from '../entities/ai-provider.entity';
import { AiModel } from '../entities/ai-model.entity';
import { AiProviderService } from './ai-provider.service';

export interface DashboardStats {
    providers: {
        total: number;
        active: number;
        statuses: ProviderStatus[];
    };
    models: {
        total: number;
        active: number;
        byPurpose: { purpose: string; count: number }[];
    };
    today: {
        totalRequests: number;
        successRate: number;
        avgLatencyMs: number;
        blockedCount: number;
        totalInputTokens: number;
        totalOutputTokens: number;
    };
    trends: DailyTrend[];
}

export interface ProviderStatus {
    providerId: string;
    providerName: string;
    isAlive: boolean;
    latencyMs?: number;
    lastChecked: Date;
}

export interface DailyTrend {
    date: string;
    requests: number;
    successRate: number;
    avgLatency: number;
    tokens: number;
}

export interface CostReport {
    period: {
        start: Date;
        end: Date;
    };
    byProvider: {
        providerId: string;
        providerName: string;
        requests: number;
        inputTokens: number;
        outputTokens: number;
        estimatedCost?: number;
    }[];
    byModel: {
        modelId: string;
        modelName: string;
        requests: number;
        inputTokens: number;
        outputTokens: number;
    }[];
    byUser: {
        userId: string;
        requests: number;
        tokens: number;
    }[];
    total: {
        requests: number;
        inputTokens: number;
        outputTokens: number;
        estimatedCost?: number;
    };
}

@Injectable()
export class AiMonitorService {
    private readonly logger = new Logger(AiMonitorService.name);

    constructor(
        @InjectRepository(AiExecutionLog)
        private readonly logRepo: Repository<AiExecutionLog>,
        @InjectRepository(AiProvider)
        private readonly providerRepo: Repository<AiProvider>,
        @InjectRepository(AiModel)
        private readonly modelRepo: Repository<AiModel>,
        private readonly providerService: AiProviderService,
    ) {}

    async getDashboardStats(): Promise<DashboardStats> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Provider stats
        const allProviders = await this.providerRepo.find();
        const activeProviders = allProviders.filter(p => p.isActive);

        // Check provider health
        const statuses: ProviderStatus[] = await Promise.all(
            allProviders.map(async (provider) => {
                try {
                    const result = await this.providerService.testConnection(provider.id);
                    return {
                        providerId: provider.id,
                        providerName: provider.name,
                        isAlive: result.success,
                        latencyMs: result.latencyMs,
                        lastChecked: new Date(),
                    };
                } catch {
                    return {
                        providerId: provider.id,
                        providerName: provider.name,
                        isAlive: false,
                        lastChecked: new Date(),
                    };
                }
            })
        );

        // Model stats
        const allModels = await this.modelRepo.find();
        const activeModels = allModels.filter(m => m.isActive);
        const modelsByPurpose = this.groupBy(allModels, 'purpose');

        // Today's execution stats
        const todayLogs = await this.logRepo.find({
            where: {
                createdAt: MoreThanOrEqual(today),
            },
        });

        const successLogs = todayLogs.filter(l => l.success);
        const blockedLogs = todayLogs.filter(l => l.wasBlocked);

        // Calculate trends (last 7 days)
        const trends = await this.calculateTrends(7);

        return {
            providers: {
                total: allProviders.length,
                active: activeProviders.length,
                statuses,
            },
            models: {
                total: allModels.length,
                active: activeModels.length,
                byPurpose: Object.entries(modelsByPurpose).map(([purpose, models]) => ({
                    purpose,
                    count: models.length,
                })),
            },
            today: {
                totalRequests: todayLogs.length,
                successRate: todayLogs.length > 0 ? (successLogs.length / todayLogs.length) * 100 : 0,
                avgLatencyMs: this.average(todayLogs.map(l => l.latencyMs)),
                blockedCount: blockedLogs.length,
                totalInputTokens: this.sum(todayLogs.map(l => l.inputTokens)),
                totalOutputTokens: this.sum(todayLogs.map(l => l.outputTokens)),
            },
            trends,
        };
    }

    async getCostReport(startDate: Date, endDate: Date): Promise<CostReport> {
        const logs = await this.logRepo.find({
            where: {
                createdAt: Between(startDate, endDate),
            },
            relations: ['provider', 'model'],
        });

        // Group by provider
        const byProvider = new Map<string, any>();
        const byModel = new Map<string, any>();
        const byUser = new Map<string, any>();

        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        for (const log of logs) {
            totalInputTokens += log.inputTokens;
            totalOutputTokens += log.outputTokens;

            // By Provider
            if (log.providerId) {
                const key = log.providerId;
                if (!byProvider.has(key)) {
                    byProvider.set(key, {
                        providerId: key,
                        providerName: log.provider?.name || 'Unknown',
                        requests: 0,
                        inputTokens: 0,
                        outputTokens: 0,
                    });
                }
                const p = byProvider.get(key);
                p.requests++;
                p.inputTokens += log.inputTokens;
                p.outputTokens += log.outputTokens;
            }

            // By Model
            if (log.modelId) {
                const key = log.modelId;
                if (!byModel.has(key)) {
                    byModel.set(key, {
                        modelId: key,
                        modelName: log.model?.name || 'Unknown',
                        requests: 0,
                        inputTokens: 0,
                        outputTokens: 0,
                    });
                }
                const m = byModel.get(key);
                m.requests++;
                m.inputTokens += log.inputTokens;
                m.outputTokens += log.outputTokens;
            }

            // By User
            if (log.userId) {
                const key = log.userId;
                if (!byUser.has(key)) {
                    byUser.set(key, {
                        userId: key,
                        requests: 0,
                        tokens: 0,
                    });
                }
                const u = byUser.get(key);
                u.requests++;
                u.tokens += log.inputTokens + log.outputTokens;
            }
        }

        return {
            period: { start: startDate, end: endDate },
            byProvider: Array.from(byProvider.values()),
            byModel: Array.from(byModel.values()),
            byUser: Array.from(byUser.values()),
            total: {
                requests: logs.length,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
            },
        };
    }

    async getAuditLogs(options: {
        startDate?: Date;
        endDate?: Date;
        userId?: string;
        success?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{ logs: AiExecutionLog[]; total: number }> {
        const query = this.logRepo.createQueryBuilder('log')
            .leftJoinAndSelect('log.provider', 'provider')
            .leftJoinAndSelect('log.model', 'model')
            .leftJoinAndSelect('log.promptTemplate', 'promptTemplate')
            .orderBy('log.createdAt', 'DESC');

        if (options.startDate) {
            query.andWhere('log.createdAt >= :startDate', { startDate: options.startDate });
        }
        if (options.endDate) {
            query.andWhere('log.createdAt <= :endDate', { endDate: options.endDate });
        }
        if (options.userId) {
            query.andWhere('log.userId = :userId', { userId: options.userId });
        }
        if (options.success !== undefined) {
            query.andWhere('log.success = :success', { success: options.success });
        }

        const total = await query.getCount();
        
        if (options.limit) {
            query.limit(options.limit);
        }
        if (options.offset) {
            query.offset(options.offset);
        }

        const logs = await query.getMany();

        return { logs, total };
    }

    private async calculateTrends(days: number): Promise<DailyTrend[]> {
        const trends: DailyTrend[] = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const logs = await this.logRepo.find({
                where: {
                    createdAt: Between(date, nextDate),
                },
            });

            const successLogs = logs.filter(l => l.success);

            trends.push({
                date: date.toISOString().split('T')[0],
                requests: logs.length,
                successRate: logs.length > 0 ? (successLogs.length / logs.length) * 100 : 0,
                avgLatency: this.average(logs.map(l => l.latencyMs)),
                tokens: this.sum(logs.map(l => l.inputTokens + l.outputTokens)),
            });
        }

        return trends;
    }

    private groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
        return arr.reduce((acc, item) => {
            const k = String(item[key]);
            if (!acc[k]) acc[k] = [];
            acc[k].push(item);
            return acc;
        }, {} as Record<string, T[]>);
    }

    private sum(arr: number[]): number {
        return arr.reduce((a, b) => a + (b || 0), 0);
    }

    private average(arr: number[]): number {
        const filtered = arr.filter(n => n !== undefined && n !== null);
        if (filtered.length === 0) return 0;
        return this.sum(filtered) / filtered.length;
    }
}
