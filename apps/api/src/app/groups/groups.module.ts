
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { UserGroup } from './entities/user-group.entity';
import { GroupHistory } from './entities/group-history.entity';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Group, UserGroup, GroupHistory])],
    controllers: [GroupsController],
    providers: [GroupsService],
    exports: [GroupsService],
})
export class GroupsModule { }
