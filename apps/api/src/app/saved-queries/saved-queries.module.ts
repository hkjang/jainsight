
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedQueriesController } from './saved-queries.controller';
import { SavedQueriesService } from './saved-queries.service';
import { SavedQuery } from './entities/saved-query.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SavedQuery])],
    controllers: [SavedQueriesController],
    providers: [SavedQueriesService],
})
export class SavedQueriesModule { }
