
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection } from '../connections/entities/connection.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../common/cache.service';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Connection)
        private connectionsRepository: Repository<Connection>,
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
        private cacheService: CacheService,
    ) { }

    async getStats() {
        return this.cacheService.getOrCompute(
            CACHE_KEYS.DASHBOARD_STATS,
            async () => {
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
            },
            CACHE_TTL.DEFAULT // 60 seconds
        );
    }
}
