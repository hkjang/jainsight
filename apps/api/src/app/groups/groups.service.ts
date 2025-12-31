
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { UserGroup } from './entities/user-group.entity';
import { GroupHistory, GroupHistoryAction } from './entities/group-history.entity';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group)
        private groupsRepository: Repository<Group>,
        @InjectRepository(UserGroup)
        private userGroupsRepository: Repository<UserGroup>,
        @InjectRepository(GroupHistory)
        private groupHistoryRepository: Repository<GroupHistory>,
    ) { }

    // Default organization ID for single-tenant or when not specified
    private readonly DEFAULT_ORGANIZATION_ID = 'default';

    // Group CRUD
    async create(data: Partial<Group>, createdBy: string): Promise<Group> {
        // Ensure organizationId is set (required field)
        const groupData = {
            ...data,
            organizationId: data.organizationId || this.DEFAULT_ORGANIZATION_ID,
        };
        const group = this.groupsRepository.create(groupData);
        const saved = await this.groupsRepository.save(group);
        
        await this.logHistory(saved.id, 'created', createdBy, null, saved);
        return saved;
    }

    async findAll(organizationId?: string): Promise<Group[]> {
        const where = organizationId ? { organizationId } : {};
        return this.groupsRepository.find({
            where,
            order: { name: 'ASC' }
        });
    }

    async findById(id: string): Promise<Group | null> {
        return this.groupsRepository.findOne({ where: { id } });
    }

    async findByParent(parentId: string): Promise<Group[]> {
        return this.groupsRepository.find({ where: { parentId } });
    }

    async getHierarchy(organizationId: string): Promise<Group[]> {
        // Get all groups and build hierarchy client-side
        return this.findAll(organizationId);
    }

    async update(id: string, data: Partial<Group>, updatedBy: string): Promise<Group | null> {
        const previous = await this.findById(id);
        if (!previous) return null;

        await this.groupsRepository.update(id, data);
        const updated = await this.findById(id);
        
        await this.logHistory(id, 'updated', updatedBy, previous, updated);
        return updated;
    }

    async delete(id: string, deletedBy: string): Promise<void> {
        const group = await this.findById(id);
        if (group) {
            await this.logHistory(id, 'deleted', deletedBy, group, null);
            await this.userGroupsRepository.delete({ groupId: id });
            await this.groupsRepository.delete(id);
        }
    }

    // User-Group membership
    async addMember(groupId: string, userId: string, addedBy: string, isAuto = false): Promise<UserGroup> {
        const existing = await this.userGroupsRepository.findOne({ 
            where: { groupId, userId } 
        });
        if (existing) return existing;

        const membership = this.userGroupsRepository.create({
            groupId,
            userId,
            addedBy,
            isAutoAssigned: isAuto
        });
        const saved = await this.userGroupsRepository.save(membership);
        
        await this.logHistory(groupId, 'member_added', addedBy, null, null, userId);
        return saved;
    }

    async removeMember(groupId: string, userId: string, removedBy: string): Promise<void> {
        await this.userGroupsRepository.delete({ groupId, userId });
        await this.logHistory(groupId, 'member_removed', removedBy, null, null, userId);
    }

    async getMembers(groupId: string): Promise<UserGroup[]> {
        return this.userGroupsRepository.find({ where: { groupId } });
    }

    async getUserGroups(userId: string): Promise<UserGroup[]> {
        return this.userGroupsRepository.find({ where: { userId } });
    }

    // Group History
    async getHistory(groupId: string): Promise<GroupHistory[]> {
        return this.groupHistoryRepository.find({
            where: { groupId },
            order: { performedAt: 'DESC' }
        });
    }

    private async logHistory(
        groupId: string,
        action: GroupHistoryAction,
        performedBy: string,
        previousState: unknown,
        newState: unknown,
        targetUserId?: string
    ): Promise<void> {
        const history = this.groupHistoryRepository.create({
            groupId,
            action,
            targetUserId,
            previousState: previousState as Record<string, unknown>,
            newState: newState as Record<string, unknown>,
            performedBy
        });
        await this.groupHistoryRepository.save(history);
    }

    // Auto-group functionality
    async evaluateAutoGroups(userId: string, userAttributes: Record<string, unknown>): Promise<string[]> {
        const autoGroups = await this.groupsRepository.find({ where: { isAutoGroup: true } });
        const matchedGroupIds: string[] = [];

        for (const group of autoGroups) {
            if (group.autoConditions && this.matchesConditions(userAttributes, group.autoConditions)) {
                matchedGroupIds.push(group.id);
            }
        }

        return matchedGroupIds;
    }

    private matchesConditions(
        attributes: Record<string, unknown>, 
        conditions: { field: string; operator: string; value: string }[]
    ): boolean {
        return conditions.every(condition => {
            const value = String(attributes[condition.field] || '');
            switch (condition.operator) {
                case 'equals':
                    return value === condition.value;
                case 'contains':
                    return value.includes(condition.value);
                case 'startsWith':
                    return value.startsWith(condition.value);
                case 'endsWith':
                    return value.endsWith(condition.value);
                case 'regex':
                    return new RegExp(condition.value).test(value);
                default:
                    return false;
            }
        });
    }
}
