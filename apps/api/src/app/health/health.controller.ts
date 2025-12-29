import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource,
    ) {}

    @Get()
    async check() {
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        
        let dbStatus = 'unknown';
        try {
            await this.dataSource.query('SELECT 1');
            dbStatus = 'connected';
        } catch (e) {
            dbStatus = 'disconnected';
        }

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: {
                seconds: Math.floor(uptime),
                formatted: this.formatUptime(uptime),
            },
            database: {
                status: dbStatus,
                type: this.dataSource.options.type,
            },
            memory: {
                heapUsed: this.formatBytes(memory.heapUsed),
                heapTotal: this.formatBytes(memory.heapTotal),
                rss: this.formatBytes(memory.rss),
            },
        };
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${secs}s`);
        
        return parts.join(' ');
    }

    private formatBytes(bytes: number): string {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    }
}
