import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { AuditModule } from '../audit/audit.module';
import { ConnectionsModule } from '../connections/connections.module';
import { AiAdminModule } from '../ai-admin/ai-admin.module';

@Module({
    imports: [
        ConnectionsModule,
        AuditModule,
        AiAdminModule,
    ],
    controllers: [QueryController],
    providers: [QueryService],
})
export class QueryModule { }

