
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Connection } from '../connections/entities/connection.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Connection, AuditLog]),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
