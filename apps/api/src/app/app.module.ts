import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';

// Metrics Module
import { MetricsModule } from './metrics';

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

// Config Module
import { AppConfigModule } from './config';

// Middleware
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

// New Enterprise Admin Modules
import { OrganizationsModule } from './organizations/organizations.module';
import { GroupsModule } from './groups/groups.module';
import { RbacModule } from './rbac/rbac.module';
import { QueryPoliciesModule } from './query-policies/query-policies.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

// Entities
import { User } from './users/entities/user.entity';
import { Connection } from './connections/entities/connection.entity';
import { SqlTemplate } from './sql-api/entities/sql-template.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { SavedQuery } from './saved-queries/entities/saved-query.entity';
import { QueryVersion } from './saved-queries/entities/query-version.entity';
import { AiProvider, AiModel, PromptTemplate, AiExecutionLog, Nl2SqlPolicy } from './ai-admin/entities';

// New Enterprise Entities
import { Organization } from './organizations/entities/organization.entity';
import { Group } from './groups/entities/group.entity';
import { UserGroup } from './groups/entities/user-group.entity';
import { GroupHistory } from './groups/entities/group-history.entity';
import { Role, Permission, RbacPolicy, UserRole, GroupRole, RoleResource } from './rbac/entities';
import { QueryRiskPolicy, QueryExecution } from './query-policies/entities';
import { ApiKey, ApiKeyUsage } from './api-keys/entities';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    CacheModule.register({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'jainsight.db',
      entities: [
        // Existing entities
        User, Connection, SqlTemplate, AuditLog, SavedQuery, QueryVersion,
        AiProvider, AiModel, PromptTemplate, AiExecutionLog, Nl2SqlPolicy,
        // New enterprise entities
        Organization,
        Group, UserGroup, GroupHistory,
        Role, Permission, RbacPolicy, UserRole, GroupRole, RoleResource,
        QueryRiskPolicy, QueryExecution,
        ApiKey, ApiKeyUsage,
      ],
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
    MetricsModule,
    // New Enterprise Admin Modules
    OrganizationsModule,
    GroupsModule,
    RbacModule,
    QueryPoliciesModule,
    ApiKeysModule,
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
