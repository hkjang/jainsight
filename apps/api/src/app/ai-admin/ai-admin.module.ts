import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { 
    AiProvider, 
    AiModel, 
    PromptTemplate, 
    AiExecutionLog, 
    Nl2SqlPolicy 
} from './entities';

// Services
import {
    AiProviderService,
    AiModelService,
    ModelRouterService,
    PromptManagerService,
    SqlSecurityService,
    Nl2SqlPipelineService,
    AiMonitorService,
    Nl2SqlPolicyService,
} from './services';

// Controllers
import {
    AiProviderController,
    AiModelController,
    PromptController,
    Nl2SqlPolicyController,
    AiMonitorController,
    Nl2SqlController,
} from './controllers';

import { SchemaModule } from '../schema/schema.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AiProvider,
            AiModel,
            PromptTemplate,
            AiExecutionLog,
            Nl2SqlPolicy,
        ]),
        SchemaModule,
    ],
    controllers: [
        AiProviderController,
        AiModelController,
        PromptController,
        Nl2SqlPolicyController,
        AiMonitorController,
        Nl2SqlController,
    ],
    providers: [
        AiProviderService,
        AiModelService,
        ModelRouterService,
        PromptManagerService,
        SqlSecurityService,
        Nl2SqlPipelineService,
        AiMonitorService,
        Nl2SqlPolicyService,
    ],
    exports: [
        AiProviderService,
        AiModelService,
        ModelRouterService,
        PromptManagerService,
        SqlSecurityService,
        Nl2SqlPipelineService,
        AiMonitorService,
        Nl2SqlPolicyService,
    ],
})
export class AiAdminModule {}
