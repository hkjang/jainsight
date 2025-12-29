
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from './entities/connection.entity';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Connection])],
    controllers: [ConnectionsController],
    providers: [ConnectionsService],
    exports: [ConnectionsService],
})
export class ConnectionsModule { }
