
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission, PermissionCondition } from './entities/permission.entity';
import { RbacPolicy } from './entities/rbac-policy.entity';
import { UserRole, GroupRole, RoleResource } from './entities/role-mappings.entity';

@Injectable()
export class RbacService {
    constructor(
        @InjectRepository(Role)
        private rolesRepository: Repository<Role>,
        @InjectRepository(Permission)
        private permissionsRepository: Repository<Permission>,
        @InjectRepository(RbacPolicy)
        private policiesRepository: Repository<RbacPolicy>,
        @InjectRepository(UserRole)
        private userRolesRepository: Repository<UserRole>,
        @InjectRepository(GroupRole)
        private groupRolesRepository: Repository<GroupRole>,
        @InjectRepository(RoleResource)
        private roleResourcesRepository: Repository<RoleResource>,
    ) { }

    // Role Management
    async createRole(data: Partial<Role>): Promise<Role> {
        const role = this.rolesRepository.create(data);
        return this.rolesRepository.save(role);
    }

    async getRoles(organizationId?: string): Promise<Role[]> {
        const where = organizationId ? { organizationId } : {};
        return this.rolesRepository.find({
            where,
            order: { priority: 'DESC', name: 'ASC' }
        });
    }

    async getRoleById(id: string): Promise<Role | null> {
        return this.rolesRepository.findOne({ where: { id } });
    }

    async getRoleHierarchy(roleId: string): Promise<Role[]> {
        const roles: Role[] = [];
        let currentRole = await this.getRoleById(roleId);
        
        while (currentRole) {
            roles.push(currentRole);
            if (currentRole.parentRoleId) {
                currentRole = await this.getRoleById(currentRole.parentRoleId);
            } else {
                break;
            }
        }
        
        return roles;
    }

    async updateRole(id: string, data: Partial<Role>): Promise<Role | null> {
        await this.rolesRepository.update(id, data);
        return this.getRoleById(id);
    }

    async deleteRole(id: string): Promise<void> {
        // Also delete associated permissions and mappings
        await this.permissionsRepository.delete({ roleId: id });
        await this.userRolesRepository.delete({ roleId: id });
        await this.groupRolesRepository.delete({ roleId: id });
        await this.roleResourcesRepository.delete({ roleId: id });
        await this.rolesRepository.delete(id);
    }

    // Permission Management
    async addPermission(roleId: string, data: Partial<Permission>): Promise<Permission> {
        const permission = this.permissionsRepository.create({ ...data, roleId });
        return this.permissionsRepository.save(permission);
    }

    async getPermissions(roleId: string): Promise<Permission[]> {
        return this.permissionsRepository.find({ where: { roleId } });
    }

    async removePermission(id: string): Promise<void> {
        await this.permissionsRepository.delete(id);
    }

    // User-Role Assignment
    async assignRoleToUser(
        userId: string, 
        roleId: string, 
        grantedBy: string,
        options?: { isTemporary?: boolean; expiresAt?: Date; requiresApproval?: boolean }
    ): Promise<UserRole> {
        const existing = await this.userRolesRepository.findOne({ where: { userId, roleId } });
        if (existing) return existing;

        const userRole = this.userRolesRepository.create({
            userId,
            roleId,
            grantedBy,
            isTemporary: options?.isTemporary || false,
            expiresAt: options?.expiresAt,
            approvalStatus: options?.requiresApproval ? 'pending' : 'approved'
        });
        return this.userRolesRepository.save(userRole);
    }

    async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
        await this.userRolesRepository.delete({ userId, roleId });
    }

    async getUserRoles(userId: string): Promise<UserRole[]> {
        return this.userRolesRepository.find({ 
            where: { userId, approvalStatus: 'approved' }
        });
    }

    async approveUserRole(id: string, approvedBy: string): Promise<UserRole | null> {
        await this.userRolesRepository.update(id, { 
            approvalStatus: 'approved',
            approvalReason: `Approved by ${approvedBy}`
        });
        return this.userRolesRepository.findOne({ where: { id } });
    }

    async rejectUserRole(id: string, reason: string): Promise<void> {
        await this.userRolesRepository.update(id, { 
            approvalStatus: 'rejected',
            approvalReason: reason
        });
    }

    // Group-Role Assignment
    async assignRoleToGroup(groupId: string, roleId: string, grantedBy: string): Promise<GroupRole> {
        const existing = await this.groupRolesRepository.findOne({ where: { groupId, roleId } });
        if (existing) return existing;

        const groupRole = this.groupRolesRepository.create({ groupId, roleId, grantedBy });
        return this.groupRolesRepository.save(groupRole);
    }

    async revokeRoleFromGroup(groupId: string, roleId: string): Promise<void> {
        await this.groupRolesRepository.delete({ groupId, roleId });
    }

    async getGroupRoles(groupId: string): Promise<GroupRole[]> {
        return this.groupRolesRepository.find({ where: { groupId } });
    }

    // Policy Templates
    async createPolicy(data: Partial<RbacPolicy>): Promise<RbacPolicy> {
        const policy = this.policiesRepository.create(data);
        return this.policiesRepository.save(policy);
    }

    async getPolicies(organizationId?: string): Promise<RbacPolicy[]> {
        const where: Record<string, unknown> = {};
        if (organizationId) where.organizationId = organizationId;
        return this.policiesRepository.find({ where });
    }

    async getPolicyById(id: string): Promise<RbacPolicy | null> {
        return this.policiesRepository.findOne({ where: { id } });
    }

    async getPolicyTemplates(): Promise<RbacPolicy[]> {
        return this.policiesRepository.find({ where: { isTemplate: true } });
    }

    // Permission Checking
    async checkPermission(
        userId: string, 
        groupIds: string[], 
        resource: string, 
        action: string,
        context?: { ip?: string; time?: Date }
    ): Promise<{ allowed: boolean; reason?: string }> {
        // Get all roles for user (direct + via groups)
        const userRoles = await this.getUserRoles(userId);
        const userRoleIds = userRoles.map(ur => ur.roleId);

        for (const groupId of groupIds) {
            const groupRoles = await this.getGroupRoles(groupId);
            userRoleIds.push(...groupRoles.map(gr => gr.roleId));
        }

        // Get all permissions from all roles (including inherited)
        const allPermissions: Permission[] = [];
        for (const roleId of [...new Set(userRoleIds)]) {
            const roleHierarchy = await this.getRoleHierarchy(roleId);
            for (const role of roleHierarchy) {
                const perms = await this.getPermissions(role.id);
                allPermissions.push(...perms);
            }
        }

        // Sort by priority (deny takes precedence)
        const sortedPerms = allPermissions.sort((a, b) => {
            if (a.isAllow === b.isAllow) return 0;
            return a.isAllow ? 1 : -1; // Deny first
        });

        // Check each permission
        for (const perm of sortedPerms) {
            if (this.matchesResource(perm.resource, resource) && perm.action === action) {
                if (perm.conditions && !this.checkConditions(perm.conditions, context)) {
                    continue;
                }
                return { 
                    allowed: perm.isAllow, 
                    reason: perm.isAllow ? undefined : 'Explicitly denied' 
                };
            }
        }

        return { allowed: false, reason: 'No matching permission found' };
    }

    private matchesResource(pattern: string, resource: string): boolean {
        if (pattern === '*') return true;
        if (pattern === resource) return true;
        
        // Pattern matching: db:* matches db:mydb, db:mydb:public, etc.
        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            return resource.startsWith(prefix);
        }
        
        return false;
    }

    private checkConditions(conditions: PermissionCondition[], context?: { ip?: string; time?: Date }): boolean {
        if (!context) return true;

        for (const condition of conditions) {
            switch (condition.type) {
                case 'ip':
                    if (condition.config.allowedIps && context.ip) {
                        if (!condition.config.allowedIps.includes(context.ip)) return false;
                    }
                    if (condition.config.deniedIps && context.ip) {
                        if (condition.config.deniedIps.includes(context.ip)) return false;
                    }
                    break;
                case 'time':
                    if (condition.config.allowedDays && context.time) {
                        const day = context.time.getDay();
                        if (!condition.config.allowedDays.includes(day)) return false;
                    }
                    if (condition.config.allowedHoursStart !== undefined && 
                        condition.config.allowedHoursEnd !== undefined && 
                        context.time) {
                        const hour = context.time.getHours();
                        if (hour < condition.config.allowedHoursStart || 
                            hour > condition.config.allowedHoursEnd) return false;
                    }
                    break;
            }
        }

        return true;
    }

    // Permission Simulation
    async simulateUserPermissions(
        userId: string, 
        groupIds: string[]
    ): Promise<{ resource: string; action: string; allowed: boolean }[]> {
        const userRoles = await this.getUserRoles(userId);
        const userRoleIds = userRoles.map(ur => ur.roleId);

        for (const groupId of groupIds) {
            const groupRoles = await this.getGroupRoles(groupId);
            userRoleIds.push(...groupRoles.map(gr => gr.roleId));
        }

        const result: { resource: string; action: string; allowed: boolean }[] = [];
        
        for (const roleId of [...new Set(userRoleIds)]) {
            const permissions = await this.getPermissions(roleId);
            for (const perm of permissions) {
                result.push({
                    resource: perm.resource,
                    action: perm.action,
                    allowed: perm.isAllow
                });
            }
        }

        return result;
    }
}
