import { Controller, Get, Query } from '@nestjs/common';
import { AiMonitorService } from '../services/ai-monitor.service';

@Controller('admin/ai-monitor')
export class AiMonitorController {
    constructor(private readonly monitorService: AiMonitorService) {}

    @Get('dashboard')
    async getDashboardStats() {
        return this.monitorService.getDashboardStats();
    }

    @Get('costs')
    async getCostReport(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        return this.monitorService.getCostReport(start, end);
    }

    @Get('audit')
    async getAuditLogs(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('userId') userId?: string,
        @Query('success') success?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.monitorService.getAuditLogs({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            userId,
            success: success !== undefined ? success === 'true' : undefined,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
        });
    }
}
