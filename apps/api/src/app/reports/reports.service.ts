'use strict';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { QueryExecution } from '../query-policies/entities/query-execution.entity';
import { Group } from '../groups/entities/group.entity';
import { UserGroup } from '../groups/entities/user-group.entity';
import { UserRole } from '../rbac/entities/role-mappings.entity';

interface ScheduledReport {
    id: string;
    name: string;
    email: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    reportType: 'overview' | 'activity' | 'permissions' | 'risk' | 'all';
    isActive: boolean;
    lastSentAt?: Date;
    nextSendAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface OverviewStats {
    totalUsers: number;
    activeUsers: number;
    totalQueries: number;
    blockedQueries: number;
    avgRiskScore: number;
    apiCalls: number;
}

interface UserActivity {
    userId: string;
    userName: string;
    queryCount: number;
    lastActive: string;
    activeHours: number;
    trend: number[];
}

interface GroupUsage {
    name: string;
    type: string;
    members: number;
    queries: number;
    avgRisk: number;
}

interface PermissionIssue {
    userId: string;
    userName: string;
    unusedRoles: number;
    lastActive: string;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
}

interface RiskEvent {
    id: string;
    type: 'blocked' | 'warned' | 'high_risk';
    query: string;
    user: string;
    riskScore: number;
    timestamp: string;
}

interface QueryTrend {
    date: string;
    total: number;
    blocked: number;
    warned: number;
}

@Injectable()
export class ReportsService {
    // In-memory storage for scheduled reports
    private scheduledReports: ScheduledReport[] = [];
    
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(QueryExecution)
        private executionsRepository: Repository<QueryExecution>,
        @InjectRepository(Group)
        private groupsRepository: Repository<Group>,
        @InjectRepository(UserGroup)
        private userGroupsRepository: Repository<UserGroup>,
        @InjectRepository(UserRole)
        private userRolesRepository: Repository<UserRole>,
    ) {}
    
    async getOverviewStats(): Promise<OverviewStats> {
        // Get total and active users from User repository
        const totalUsers = await this.usersRepository.count();
        const activeUsers = await this.usersRepository.count({ where: { status: 'active' } });
        
        // Get query execution stats
        const totalQueries = await this.executionsRepository.count();
        const blockedQueries = await this.executionsRepository.count({ where: { status: 'blocked' } });
        
        // Calculate average risk score
        const executions = await this.executionsRepository.find();
        const avgRiskScore = executions.length > 0
            ? Math.round(executions.reduce((sum, e) => sum + (e.riskScore || 0), 0) / executions.length)
            : 0;
        
        // Estimate API calls (could track in a separate table if needed)
        const apiCalls = totalQueries * 3; // Rough estimate
        
        return {
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            totalQueries: totalQueries || 0,
            blockedQueries: blockedQueries || 0,
            avgRiskScore,
            apiCalls
        };
    }

    async getUserActivities(days: number = 7): Promise<UserActivity[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Get users with their query counts
        const users = await this.usersRepository.find({
            select: ['id', 'email', 'name', 'lastLoginAt'],
            take: 20 // Top 20 users
        });
        
        const activities: UserActivity[] = [];
        
        for (const user of users) {
            const queryCount = await this.executionsRepository.count({
                where: {
                    executedBy: user.id,
                    executedAt: MoreThanOrEqual(startDate)
                }
            });
            
            // Generate trend data (last 7 days)
            const trend: number[] = [];
            for (let i = 6; i >= 0; i--) {
                const dayStart = new Date();
                dayStart.setDate(dayStart.getDate() - i);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(dayStart);
                dayEnd.setHours(23, 59, 59, 999);
                
                const dayCount = await this.executionsRepository.count({
                    where: {
                        executedBy: user.id,
                        executedAt: Between(dayStart, dayEnd)
                    }
                });
                trend.push(dayCount);
            }
            
            // Calculate relative last active time
            let lastActive = '활동 없음';
            if (user.lastLoginAt) {
                const diff = Date.now() - new Date(user.lastLoginAt).getTime();
                const minutes = Math.floor(diff / 60000);
                if (minutes < 60) lastActive = `${minutes}분 전`;
                else if (minutes < 1440) lastActive = `${Math.floor(minutes / 60)}시간 전`;
                else lastActive = `${Math.floor(minutes / 1440)}일 전`;
            }
            
            activities.push({
                userId: user.id,
                userName: user.email || user.name || 'Unknown',
                queryCount,
                lastActive,
                activeHours: Math.round(queryCount / 10 * 10) / 10, // Estimate based on queries
                trend
            });
        }
        
        // Sort by query count descending
        return activities.sort((a, b) => b.queryCount - a.queryCount);
    }

    async getGroupUsages(): Promise<GroupUsage[]> {
        const groups = await this.groupsRepository.find();
        const usages: GroupUsage[] = [];
        
        for (const group of groups) {
            // Count members in this group
            const members = await this.userGroupsRepository.count({
                where: { groupId: group.id }
            });
            
            // Get group member IDs
            const memberRecords = await this.userGroupsRepository.find({
                where: { groupId: group.id },
                select: ['userId']
            });
            const memberIds = memberRecords.map(m => m.userId);
            
            // Count queries by group members
            let queries = 0;
            let totalRisk = 0;
            let riskCount = 0;
            
            for (const userId of memberIds) {
                const userQueries = await this.executionsRepository.count({
                    where: { executedBy: userId }
                });
                queries += userQueries;
                
                const userExecutions = await this.executionsRepository.find({
                    where: { executedBy: userId },
                    select: ['riskScore']
                });
                for (const exec of userExecutions) {
                    if (exec.riskScore !== undefined) {
                        totalRisk += exec.riskScore;
                        riskCount++;
                    }
                }
            }
            
            usages.push({
                name: group.name,
                type: group.type || 'general',
                members,
                queries,
                avgRisk: riskCount > 0 ? Math.round(totalRisk / riskCount) : 0
            });
        }
        
        // Sort by query count descending
        return usages.sort((a, b) => b.queries - a.queries);
    }

    async getPermissionIssues(): Promise<PermissionIssue[]> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Find users who haven't logged in recently
        const inactiveUsers = await this.usersRepository.find({
            where: [
                { lastLoginAt: null as unknown as Date },
                { status: 'locked' }
            ],
            take: 20
        });
        
        const issues: PermissionIssue[] = [];
        
        for (const user of inactiveUsers) {
            // Count roles assigned to this user
            const rolesCount = await this.userRolesRepository.count({
                where: { userId: user.id }
            });
            
            if (rolesCount === 0) continue; // No roles, no issue
            
            let lastActive = '활동 기록 없음';
            let severity: 'low' | 'medium' | 'high' = 'low';
            let recommendation = '역할 검토 필요';
            
            if (user.lastLoginAt) {
                const diff = Date.now() - new Date(user.lastLoginAt).getTime();
                const days = Math.floor(diff / (24 * 60 * 60 * 1000));
                lastActive = `${days}일 전`;
                
                if (days > 90) {
                    severity = 'high';
                    recommendation = '계정 비활성화 검토';
                } else if (days > 30) {
                    severity = 'medium';
                    recommendation = '미사용 역할 제거 권장';
                }
            } else {
                severity = 'high';
                recommendation = '한번도 로그인하지 않음 - 초대 재발송 또는 계정 삭제';
            }
            
            issues.push({
                userId: user.id,
                userName: user.email || user.name || 'Unknown',
                unusedRoles: rolesCount,
                lastActive,
                recommendation,
                severity
            });
        }
        
        // Sort by severity (high first)
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }

    async getRiskEvents(limit: number = 10): Promise<RiskEvent[]> {
        // Get recent blocked or high-risk executions
        const executions = await this.executionsRepository.find({
            order: { executedAt: 'DESC' },
            take: limit * 2 // Get more to filter
        });
        
        const events: RiskEvent[] = [];
        
        for (const exec of executions) {
            let type: 'blocked' | 'warned' | 'high_risk' | null = null;
            
            if (exec.status === 'blocked') {
                type = 'blocked';
            } else if (exec.riskScore >= 70) {
                type = 'high_risk';
            } else if (exec.riskScore >= 50) {
                type = 'warned';
            }
            
            if (!type) continue;
            
            events.push({
                id: exec.id,
                type,
                query: exec.rawQuery || 'Unknown query',
                user: exec.executedBy || 'unknown',
                riskScore: exec.riskScore || 0,
                timestamp: exec.executedAt ? new Date(exec.executedAt).toISOString() : new Date().toISOString()
            });
            
            if (events.length >= limit) break;
        }
        
        return events;
    }

    async getQueryTrends(days: number = 14): Promise<QueryTrend[]> {
        const trends: QueryTrend[] = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            
            const total = await this.executionsRepository.count({
                where: { executedAt: Between(dayStart, dayEnd) }
            });
            
            const blocked = await this.executionsRepository.count({
                where: {
                    executedAt: Between(dayStart, dayEnd),
                    status: 'blocked'
                }
            });
            
            // Count warnings (risk score >= 50 but not blocked)
            const execsForDay = await this.executionsRepository.find({
                where: {
                    executedAt: Between(dayStart, dayEnd)
                },
                select: ['riskScore', 'status']
            });
            const warned = execsForDay.filter(e => e.riskScore >= 50 && e.status !== 'blocked').length;
            
            trends.push({
                date: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
                total,
                blocked,
                warned
            });
        }
        
        return trends;
    }

    // Scheduled Report CRUD methods remain the same
    async createScheduledReport(data: {
        name: string;
        email: string;
        frequency: 'daily' | 'weekly' | 'monthly';
        reportType?: string;
    }): Promise<ScheduledReport> {
        const now = new Date();
        const report: ScheduledReport = {
            id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: data.name,
            email: data.email,
            frequency: data.frequency,
            reportType: (data.reportType as ScheduledReport['reportType']) || 'all',
            isActive: true,
            nextSendAt: this.calculateNextSend(data.frequency, now),
            createdAt: now,
            updatedAt: now
        };
        
        this.scheduledReports.push(report);
        return report;
    }

    async getScheduledReports(): Promise<ScheduledReport[]> {
        return this.scheduledReports;
    }

    async getScheduledReportById(id: string): Promise<ScheduledReport> {
        const report = this.scheduledReports.find(r => r.id === id);
        if (!report) throw new NotFoundException('Scheduled report not found');
        return report;
    }

    async updateScheduledReport(id: string, data: Partial<ScheduledReport>): Promise<ScheduledReport> {
        const index = this.scheduledReports.findIndex(r => r.id === id);
        if (index === -1) throw new NotFoundException('Scheduled report not found');
        
        const updated = {
            ...this.scheduledReports[index],
            ...data,
            updatedAt: new Date()
        };
        
        if (data.frequency && data.frequency !== this.scheduledReports[index].frequency) {
            updated.nextSendAt = this.calculateNextSend(data.frequency, new Date());
        }
        
        this.scheduledReports[index] = updated;
        return updated;
    }

    async deleteScheduledReport(id: string): Promise<{ success: boolean }> {
        const index = this.scheduledReports.findIndex(r => r.id === id);
        if (index === -1) throw new NotFoundException('Scheduled report not found');
        
        this.scheduledReports.splice(index, 1);
        return { success: true };
    }

    async toggleScheduledReport(id: string): Promise<ScheduledReport> {
        const report = await this.getScheduledReportById(id);
        return this.updateScheduledReport(id, { isActive: !report.isActive });
    }

    private calculateNextSend(frequency: 'daily' | 'weekly' | 'monthly', from: Date): Date {
        const next = new Date(from);
        switch (frequency) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                next.setHours(9, 0, 0, 0);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                next.setHours(9, 0, 0, 0);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                next.setDate(1);
                next.setHours(9, 0, 0, 0);
                break;
        }
        return next;
    }
}
