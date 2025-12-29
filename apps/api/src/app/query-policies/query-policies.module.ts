
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryRiskPolicy, QueryExecution } from './entities';
import { QueryPoliciesService } from './query-policies.service';
import { QueryPoliciesController } from './query-policies.controller';

@Module({
    imports: [TypeOrmModule.forFeature([QueryRiskPolicy, QueryExecution])],
    controllers: [QueryPoliciesController],
    providers: [QueryPoliciesService],
    exports: [QueryPoliciesService],
})
export class QueryPoliciesModule { }
