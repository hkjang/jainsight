
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from './entities/connection.entity';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { GroupsModule } from '../groups/groups.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Connection]),
        forwardRef(() => GroupsModule),
    ],
    controllers: [ConnectionsController],
    providers: [ConnectionsService],
    exports: [ConnectionsService],
})
export class ConnectionsModule { }
