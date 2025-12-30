
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SchemaModule } from '../schema/schema.module';
import { SchemaTranslatorService } from './schema-translator.service';
import { AiProvider } from '../ai-admin/entities/ai-provider.entity';

@Module({
    imports: [
        SchemaModule,
        TypeOrmModule.forFeature([AiProvider]),
    ],
    controllers: [AiController],
    providers: [AiService, SchemaTranslatorService],
    exports: [AiService, SchemaTranslatorService],
})
export class AiModule { }
