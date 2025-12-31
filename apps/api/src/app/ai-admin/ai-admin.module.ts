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
import { SecuritySettings } from './entities/security-settings.entity';

// Services
import {
    AiProviderService,
    AiModelService,
    AiDiagnosticService,
    ModelRouterService,
    PromptManagerService,
    SqlSecurityService,
    Nl2SqlPipelineService,
    AiMonitorService,
    Nl2SqlPolicyService,
} from './services';
import { SecuritySettingsService } from './services/security-settings.service';

// Controllers
import {
    AiProviderController,
    AiModelController,
    PromptController,
    Nl2SqlPolicyController,
    AiMonitorController,
    Nl2SqlController,
} from './controllers';
import { SecuritySettingsController } from './controllers/security-settings.controller';

import { SchemaModule } from '../schema/schema.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AiProvider,
            AiModel,
            PromptTemplate,
            AiExecutionLog,
            Nl2SqlPolicy,
            SecuritySettings,
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
        SecuritySettingsController,
    ],
    providers: [
        AiProviderService,
        AiModelService,
        AiDiagnosticService,
        ModelRouterService,
        PromptManagerService,
        SqlSecurityService,
        Nl2SqlPipelineService,
        AiMonitorService,
        Nl2SqlPolicyService,
        SecuritySettingsService,
    ],
    exports: [
        AiProviderService,
        AiModelService,
        AiDiagnosticService,
        ModelRouterService,
        PromptManagerService,
        SqlSecurityService,
        Nl2SqlPipelineService,
        AiMonitorService,
        Nl2SqlPolicyService,
        SecuritySettingsService,
    ],
})
export class AiAdminModule {}

