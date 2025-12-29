
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryRiskPolicy, PolicyAction } from './entities/query-risk-policy.entity';
import { QueryExecution } from './entities/query-execution.entity';

export interface QueryValidationResult {
    allowed: boolean;
    riskScore: number;
    action: PolicyAction;
    matchedPolicies: { id: string; name: string; reason: string }[];
}

@Injectable()
export class QueryPoliciesService {
    private readonly ddlKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
    private readonly dmlKeywords = ['INSERT', 'UPDATE', 'DELETE'];

    constructor(
        @InjectRepository(QueryRiskPolicy)
        private policiesRepository: Repository<QueryRiskPolicy>,
        @InjectRepository(QueryExecution)
        private executionsRepository: Repository<QueryExecution>,
    ) { }

    // Policy Management
    async createPolicy(data: Partial<QueryRiskPolicy>): Promise<QueryRiskPolicy> {
        const policy = this.policiesRepository.create(data);
        return this.policiesRepository.save(policy);
    }

    async getPolicies(organizationId?: string, connectionId?: string): Promise<QueryRiskPolicy[]> {
        const where: Record<string, unknown> = { isActive: true };
        if (organizationId) where.organizationId = organizationId;
        if (connectionId) where.connectionId = connectionId;
        
        return this.policiesRepository.find({ where, order: { riskScore: 'DESC' } });
    }

    async getPolicyById(id: string): Promise<QueryRiskPolicy | null> {
        return this.policiesRepository.findOne({ where: { id } });
    }

    async updatePolicy(id: string, data: Partial<QueryRiskPolicy>): Promise<QueryRiskPolicy | null> {
        await this.policiesRepository.update(id, data);
        return this.getPolicyById(id);
    }

    async deletePolicy(id: string): Promise<void> {
        await this.policiesRepository.delete(id);
    }

    // Query Validation
    async validateQuery(
        query: string, 
        organizationId?: string,
        connectionId?: string
    ): Promise<QueryValidationResult> {
        const normalizedQuery = query.toUpperCase().trim();
        const policies = await this.getPolicies(organizationId, connectionId);
        
        const matchedPolicies: { id: string; name: string; reason: string }[] = [];
        let maxRiskScore = 0;
        let highestAction: PolicyAction = 'warn';

        for (const policy of policies) {
            const match = this.checkPolicy(normalizedQuery, policy);
            if (match.matched) {
                matchedPolicies.push({
                    id: policy.id,
                    name: policy.name,
                    reason: match.reason
                });
                
                if (policy.riskScore > maxRiskScore) {
                    maxRiskScore = policy.riskScore;
                    highestAction = policy.action;
                }
            }
        }

        return {
            allowed: highestAction !== 'block',
            riskScore: maxRiskScore,
            action: highestAction,
            matchedPolicies
        };
    }

    private checkPolicy(query: string, policy: QueryRiskPolicy): { matched: boolean; reason: string } {
        switch (policy.type) {
            case 'ddl_block':
                for (const keyword of this.ddlKeywords) {
                    if (query.includes(keyword)) {
                        return { matched: true, reason: `Contains DDL keyword: ${keyword}` };
                    }
                }
                break;

            case 'where_required':
                if ((query.includes('UPDATE') || query.includes('DELETE')) && !query.includes('WHERE')) {
                    return { matched: true, reason: 'UPDATE/DELETE without WHERE clause' };
                }
                break;

            case 'limit_required':
                if (query.includes('SELECT') && !query.includes('LIMIT')) {
                    return { matched: true, reason: 'SELECT without LIMIT clause' };
                }
                break;

            case 'keyword_block':
                if (policy.blockedKeywords) {
                    for (const keyword of policy.blockedKeywords) {
                        if (query.includes(keyword.toUpperCase())) {
                            return { matched: true, reason: `Contains blocked keyword: ${keyword}` };
                        }
                    }
                }
                break;

            case 'table_restrict':
                if (policy.restrictedTables) {
                    for (const table of policy.restrictedTables) {
                        if (query.includes(table.toUpperCase())) {
                            return { matched: true, reason: `Accesses restricted table: ${table}` };
                        }
                    }
                }
                break;

            case 'custom':
                if (policy.pattern) {
                    try {
                        const regex = new RegExp(policy.pattern, 'i');
                        if (regex.test(query)) {
                            return { matched: true, reason: `Matches custom pattern` };
                        }
                    } catch {
                        // Invalid regex, skip
                    }
                }
                break;
        }

        return { matched: false, reason: '' };
    }

    // Execution Tracking
    async logExecution(data: Partial<QueryExecution>): Promise<QueryExecution> {
        const execution = this.executionsRepository.create(data);
        return this.executionsRepository.save(execution);
    }

    async getExecutions(options: {
        userId?: string;
        connectionId?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<QueryExecution[]> {
        const qb = this.executionsRepository.createQueryBuilder('execution');
        
        if (options.userId) {
            qb.andWhere('execution.executedBy = :userId', { userId: options.userId });
        }
        if (options.connectionId) {
            qb.andWhere('execution.connectionId = :connectionId', { connectionId: options.connectionId });
        }
        if (options.status) {
            qb.andWhere('execution.status = :status', { status: options.status });
        }
        if (options.startDate) {
            qb.andWhere('execution.executedAt >= :startDate', { startDate: options.startDate });
        }
        if (options.endDate) {
            qb.andWhere('execution.executedAt <= :endDate', { endDate: options.endDate });
        }

        qb.orderBy('execution.executedAt', 'DESC');
        qb.take(options.limit || 100);

        return qb.getMany();
    }

    async getBlockedExecutions(organizationId?: string): Promise<QueryExecution[]> {
        const where: Record<string, unknown> = { status: 'blocked' };
        // organizationId not directly on QueryExecution, would need join
        return this.executionsRepository.find({ 
            where, 
            order: { executedAt: 'DESC' },
            take: 100
        });
    }

    // Risk Statistics
    async getRiskStats(startDate?: Date, endDate?: Date): Promise<{
        totalExecutions: number;
        blockedCount: number;
        highRiskCount: number;
        avgRiskScore: number;
    }> {
        const qb = this.executionsRepository.createQueryBuilder('execution');
        
        if (startDate) {
            qb.andWhere('execution.executedAt >= :startDate', { startDate });
        }
        if (endDate) {
            qb.andWhere('execution.executedAt <= :endDate', { endDate });
        }

        const executions = await qb.getMany();
        const totalExecutions = executions.length;
        const blockedCount = executions.filter(e => e.status === 'blocked').length;
        const highRiskCount = executions.filter(e => e.riskScore >= 70).length;
        const avgRiskScore = totalExecutions > 0 
            ? executions.reduce((sum, e) => sum + e.riskScore, 0) / totalExecutions 
            : 0;

        return { totalExecutions, blockedCount, highRiskCount, avgRiskScore };
    }
}
