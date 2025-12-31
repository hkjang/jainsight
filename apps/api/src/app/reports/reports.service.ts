'use strict';

import { Injectable, NotFoundException } from '@nestjs/common';

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

@Injectable()
export class ReportsService {
    // In-memory storage for scheduled reports
    private scheduledReports: ScheduledReport[] = [];
    
    async getOverviewStats(): Promise<OverviewStats> {
        // TODO: Aggregate from real data sources
        return {
            totalUsers: 85,
            activeUsers: 62,
            totalQueries: 15420,
            blockedQueries: 234,
            avgRiskScore: 32,
            apiCalls: 128500
        };
    }

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
