
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SchemaModule } from '../schema/schema.module';

@Module({
    imports: [SchemaModule],
    controllers: [AiController],
    providers: [AiService],
})
export class AiModule { }
