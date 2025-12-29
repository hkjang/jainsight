
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryPoliciesService, QueryValidationResult } from './query-policies.service';
import { QueryRiskPolicy } from './entities/query-risk-policy.entity';
import { QueryExecution } from './entities/query-execution.entity';

@Controller('query-policies')
export class QueryPoliciesController {
    constructor(private readonly queryPoliciesService: QueryPoliciesService) { }

    // Policy Management
    @Get()
    async getPolicies(
        @Query('organizationId') organizationId?: string,
        @Query('connectionId') connectionId?: string
    ): Promise<QueryRiskPolicy[]> {
        return this.queryPoliciesService.getPolicies(organizationId, connectionId);
    }

    @Get(':id')
    async getPolicyById(@Param('id') id: string): Promise<QueryRiskPolicy | null> {
        return this.queryPoliciesService.getPolicyById(id);
    }

    @Post()
    async createPolicy(@Body() data: Partial<QueryRiskPolicy>): Promise<QueryRiskPolicy> {
        return this.queryPoliciesService.createPolicy(data);
    }

    @Put(':id')
    async updatePolicy(
        @Param('id') id: string,
        @Body() data: Partial<QueryRiskPolicy>
    ): Promise<QueryRiskPolicy | null> {
        return this.queryPoliciesService.updatePolicy(id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deletePolicy(@Param('id') id: string): Promise<void> {
        return this.queryPoliciesService.deletePolicy(id);
    }

    // Query Validation
    @Post('validate')
    async validateQuery(
        @Body() data: { query: string; organizationId?: string; connectionId?: string }
    ): Promise<QueryValidationResult> {
        return this.queryPoliciesService.validateQuery(data.query, data.organizationId, data.connectionId);
    }

    // Executions
    @Get('executions')
    async getExecutions(
        @Query('userId') userId?: string,
        @Query('connectionId') connectionId?: string,
        @Query('status') status?: string,
        @Query('limit') limit?: string
    ): Promise<QueryExecution[]> {
        return this.queryPoliciesService.getExecutions({
            userId,
            connectionId,
            status,
            limit: limit ? parseInt(limit, 10) : undefined
        });
    }

    @Get('executions/blocked')
    async getBlockedExecutions(
        @Query('organizationId') organizationId?: string
    ): Promise<QueryExecution[]> {
        return this.queryPoliciesService.getBlockedExecutions(organizationId);
    }

    @Post('executions')
    async logExecution(@Body() data: Partial<QueryExecution>): Promise<QueryExecution> {
        return this.queryPoliciesService.logExecution(data);
    }

    // Statistics
    @Get('stats')
    async getRiskStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ): Promise<{
        totalExecutions: number;
        blockedCount: number;
        highRiskCount: number;
        avgRiskScore: number;
    }> {
        return this.queryPoliciesService.getRiskStats(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );
    }
}
