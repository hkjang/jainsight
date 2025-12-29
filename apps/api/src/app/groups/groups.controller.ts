
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group } from './entities/group.entity';
import { UserGroup } from './entities/user-group.entity';
import { GroupHistory } from './entities/group-history.entity';

@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Get()
    async findAll(@Query('organizationId') organizationId?: string): Promise<Group[]> {
        return this.groupsService.findAll(organizationId);
    }

    @Get('hierarchy/:organizationId')
    async getHierarchy(@Param('organizationId') organizationId: string): Promise<Group[]> {
        return this.groupsService.getHierarchy(organizationId);
    }

    @Get(':id')
    async findById(@Param('id') id: string): Promise<Group | null> {
        return this.groupsService.findById(id);
    }

    @Get(':id/children')
    async findChildren(@Param('id') id: string): Promise<Group[]> {
        return this.groupsService.findByParent(id);
    }

    @Post()
    async create(@Body() data: Partial<Group> & { createdBy: string }): Promise<Group> {
        const { createdBy, ...groupData } = data;
        return this.groupsService.create(groupData, createdBy || 'system');
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() data: Partial<Group> & { updatedBy: string }
    ): Promise<Group | null> {
        const { updatedBy, ...groupData } = data;
        return this.groupsService.update(id, groupData, updatedBy || 'system');
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('id') id: string,
        @Query('deletedBy') deletedBy: string
    ): Promise<void> {
        return this.groupsService.delete(id, deletedBy || 'system');
    }

    // Membership endpoints
    @Get(':id/members')
    async getMembers(@Param('id') id: string): Promise<UserGroup[]> {
        return this.groupsService.getMembers(id);
    }

    @Post(':id/members')
    async addMember(
        @Param('id') id: string,
        @Body() data: { userId: string; addedBy: string }
    ): Promise<UserGroup> {
        return this.groupsService.addMember(id, data.userId, data.addedBy);
    }

    @Delete(':id/members/:userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeMember(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Query('removedBy') removedBy: string
    ): Promise<void> {
        return this.groupsService.removeMember(id, userId, removedBy || 'system');
    }

    // History endpoint
    @Get(':id/history')
    async getHistory(@Param('id') id: string): Promise<GroupHistory[]> {
        return this.groupsService.getHistory(id);
    }
}
