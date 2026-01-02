
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlApiService } from './sql-api.service';
import { SqlApiController } from './sql-api.controller';
import { SqlTemplate } from './entities/sql-template.entity';
import { Connection } from '../connections/entities/connection.entity';
import { User } from '../users/entities/user.entity';
import { DatabaseConnectorModule } from '../database-connector/database-connector.module';
import { ConnectionsModule } from '../connections/connections.module';
import { SqlApiDocService } from './sql-api-doc.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([SqlTemplate, Connection, User]),
        DatabaseConnectorModule,
        ConnectionsModule,
        ApiKeysModule,
    ],
    controllers: [SqlApiController],
    providers: [SqlApiService, SqlApiDocService],
    exports: [SqlApiService],
})
export class SqlApiModule { }
