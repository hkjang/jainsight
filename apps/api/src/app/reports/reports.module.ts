'use strict';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { User } from '../users/entities/user.entity';
import { QueryExecution } from '../query-policies/entities/query-execution.entity';
import { Group } from '../groups/entities/group.entity';
import { UserGroup } from '../groups/entities/user-group.entity';
import { UserRole } from '../rbac/entities/role-mappings.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            QueryExecution,
            Group,
            UserGroup,
            UserRole
        ])
    ],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService]
})
export class ReportsModule {}
