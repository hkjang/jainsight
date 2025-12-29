import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConnectorModule } from './database-connector/database-connector.module';
import { ConnectionsModule } from './connections/connections.module';
import { QueryModule } from './query/query.module';
import { SchemaModule } from './schema/schema.module';
import { AuditModule } from './audit/audit.module';
import { AiModule } from './ai/ai.module';
import { AiAdminModule } from './ai-admin/ai-admin.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SavedQueriesModule } from './saved-queries/saved-queries.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SqlApiModule } from './sql-api/sql-api.module';
import { HealthModule } from './health/health.module';
import { User } from './users/entities/user.entity';
import { Connection } from './connections/entities/connection.entity';
import { SqlTemplate } from './sql-api/entities/sql-template.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { SavedQuery } from './saved-queries/entities/saved-query.entity';
import { AiProvider, AiModel, PromptTemplate, AiExecutionLog, Nl2SqlPolicy } from './ai-admin/entities';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    CacheModule.register({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'jainsight.db',
      entities: [User, Connection, SqlTemplate, AuditLog, SavedQuery, AiProvider, AiModel, PromptTemplate, AiExecutionLog, Nl2SqlPolicy],
      synchronize: true, // Auto-create tables in dev
    }),
    DatabaseConnectorModule,
    ConnectionsModule,
    QueryModule,
    SchemaModule,
    AuditModule,
    AiModule,
    AiAdminModule,
    DashboardModule,
    SavedQueriesModule,
    AuthModule,
    UsersModule,
    SqlApiModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
