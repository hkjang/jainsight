
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection } from '../connections/entities/connection.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Connection)
        private connectionsRepository: Repository<Connection>,
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    async getStats() {
        const connectionsCount = await this.connectionsRepository.count();
        const queriesCount = await this.auditLogRepository.count();
        const failedQueriesCount = await this.auditLogRepository.count({
            where: { status: 'FAILURE' },
        });

        const recentActivity = await this.auditLogRepository.find({
            order: { executedAt: 'DESC' },
            take: 5,
        });

        return {
            connectionsCount,
            queriesCount,
            failedQueriesCount,
            recentActivity: recentActivity || [],
        };
    }
}
