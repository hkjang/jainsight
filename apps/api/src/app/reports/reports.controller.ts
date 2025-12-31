'use strict';

import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('stats')
    async getOverviewStats() {
        return this.reportsService.getOverviewStats();
    }

    @Get('scheduled')
    async getScheduledReports() {
        return this.reportsService.getScheduledReports();
    }

    @Get('scheduled/:id')
    async getScheduledReportById(@Param('id') id: string) {
        return this.reportsService.getScheduledReportById(id);
    }

    @Post('scheduled')
    async createScheduledReport(
        @Body() data: { name: string; email: string; frequency: 'daily' | 'weekly' | 'monthly'; reportType?: string }
    ) {
        return this.reportsService.createScheduledReport(data);
    }

    @Put('scheduled/:id')
    async updateScheduledReport(
        @Param('id') id: string,
        @Body() data: Record<string, unknown>
    ) {
        return this.reportsService.updateScheduledReport(id, data as never);
    }

    @Delete('scheduled/:id')
    async deleteScheduledReport(@Param('id') id: string) {
        return this.reportsService.deleteScheduledReport(id);
    }

    @Post('scheduled/:id/toggle')
    async toggleScheduledReport(@Param('id') id: string) {
        return this.reportsService.toggleScheduledReport(id);
    }
}
