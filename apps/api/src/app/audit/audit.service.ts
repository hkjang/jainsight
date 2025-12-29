
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
    ) { }

    async logQuery(data: {
        connectionId: string;
        connectionName: string;
        query: string;
        status: 'SUCCESS' | 'FAILURE';
        durationMs: number;
        rowCount?: number;
        errorMessage?: string;
        executedBy?: string;
    }) {
        const log = this.auditRepository.create(data);
        return this.auditRepository.save(log);
    }

    findAll() {
        return this.auditRepository.find({
            order: { executedAt: 'DESC' },
            take: 100, // Limit to last 100 logs
        });
    }
}
