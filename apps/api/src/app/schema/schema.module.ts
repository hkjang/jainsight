import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchemaController } from './schema.controller';
import { SchemaService } from './schema.service';
import { TableTranslationService } from './table-translation.service';
import { TableTranslation } from './entities/table-translation.entity';
import { AiProvider } from '../ai-admin/entities/ai-provider.entity';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
    imports: [
        ConnectionsModule,
        TypeOrmModule.forFeature([TableTranslation, AiProvider]),
    ],
    controllers: [SchemaController],
    providers: [SchemaService, TableTranslationService],
    exports: [SchemaService, TableTranslationService],
})
export class SchemaModule { }
