
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RbacPolicy } from './entities/rbac-policy.entity';
import { UserRole, GroupRole } from './entities/role-mappings.entity';

@Controller('rbac')
export class RbacController {
    constructor(private readonly rbacService: RbacService) { }

    // Role endpoints
    @Get('roles')
    async getRoles(@Query('organizationId') organizationId?: string): Promise<Role[]> {
        return this.rbacService.getRoles(organizationId);
    }

    @Get('roles/:id')
    async getRoleById(@Param('id') id: string): Promise<Role | null> {
        return this.rbacService.getRoleById(id);
    }

    @Get('roles/:id/hierarchy')
    async getRoleHierarchy(@Param('id') id: string): Promise<Role[]> {
        return this.rbacService.getRoleHierarchy(id);
    }

    @Post('roles')
    async createRole(@Body() data: Partial<Role>): Promise<Role> {
        return this.rbacService.createRole(data);
    }

    @Put('roles/:id')
    async updateRole(@Param('id') id: string, @Body() data: Partial<Role>): Promise<Role | null> {
        return this.rbacService.updateRole(id, data);
    }

    @Delete('roles/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRole(@Param('id') id: string): Promise<void> {
        return this.rbacService.deleteRole(id);
    }

    // Permission endpoints
    @Get('roles/:roleId/permissions')
    async getPermissions(@Param('roleId') roleId: string): Promise<Permission[]> {
        return this.rbacService.getPermissions(roleId);
    }

    @Post('roles/:roleId/permissions')
    async addPermission(
        @Param('roleId') roleId: string,
        @Body() data: Partial<Permission>
    ): Promise<Permission> {
        return this.rbacService.addPermission(roleId, data);
    }

    @Delete('permissions/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removePermission(@Param('id') id: string): Promise<void> {
        return this.rbacService.removePermission(id);
    }

    // User-Role endpoints
    @Get('users/:userId/roles')
    async getUserRoles(@Param('userId') userId: string): Promise<UserRole[]> {
        return this.rbacService.getUserRoles(userId);
    }

    @Post('users/:userId/roles')
    async assignRoleToUser(
        @Param('userId') userId: string,
        @Body() data: { roleId: string; grantedBy: string; isTemporary?: boolean; expiresAt?: Date; requiresApproval?: boolean }
    ): Promise<UserRole> {
        return this.rbacService.assignRoleToUser(userId, data.roleId, data.grantedBy, {
            isTemporary: data.isTemporary,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            requiresApproval: data.requiresApproval
        });
    }

    @Delete('users/:userId/roles/:roleId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeRoleFromUser(
        @Param('userId') userId: string,
        @Param('roleId') roleId: string
    ): Promise<void> {
        return this.rbacService.revokeRoleFromUser(userId, roleId);
    }

    @Put('user-roles/:id/approve')
    async approveUserRole(
        @Param('id') id: string,
        @Body() data: { approvedBy: string }
    ): Promise<UserRole | null> {
        return this.rbacService.approveUserRole(id, data.approvedBy);
    }

    @Put('user-roles/:id/reject')
    @HttpCode(HttpStatus.NO_CONTENT)
    async rejectUserRole(
        @Param('id') id: string,
        @Body() data: { reason: string }
    ): Promise<void> {
        return this.rbacService.rejectUserRole(id, data.reason);
    }

    // Group-Role endpoints
    @Get('groups/:groupId/roles')
    async getGroupRoles(@Param('groupId') groupId: string): Promise<GroupRole[]> {
        return this.rbacService.getGroupRoles(groupId);
    }

    @Post('groups/:groupId/roles')
    async assignRoleToGroup(
        @Param('groupId') groupId: string,
        @Body() data: { roleId: string; grantedBy: string }
    ): Promise<GroupRole> {
        return this.rbacService.assignRoleToGroup(groupId, data.roleId, data.grantedBy);
    }

    @Delete('groups/:groupId/roles/:roleId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeRoleFromGroup(
        @Param('groupId') groupId: string,
        @Param('roleId') roleId: string
    ): Promise<void> {
        return this.rbacService.revokeRoleFromGroup(groupId, roleId);
    }

    // Policy endpoints
    @Get('policies')
    async getPolicies(@Query('organizationId') organizationId?: string): Promise<RbacPolicy[]> {
        return this.rbacService.getPolicies(organizationId);
    }

    @Get('policies/templates')
    async getPolicyTemplates(): Promise<RbacPolicy[]> {
        return this.rbacService.getPolicyTemplates();
    }

    @Get('policies/:id')
    async getPolicyById(@Param('id') id: string): Promise<RbacPolicy | null> {
        return this.rbacService.getPolicyById(id);
    }

    @Post('policies')
    async createPolicy(@Body() data: Partial<RbacPolicy>): Promise<RbacPolicy> {
        return this.rbacService.createPolicy(data);
    }

    // Permission checking endpoints
    @Post('check')
    async checkPermission(
        @Body() data: { userId: string; groupIds: string[]; resource: string; action: string; ip?: string }
    ): Promise<{ allowed: boolean; reason?: string }> {
        return this.rbacService.checkPermission(
            data.userId, 
            data.groupIds, 
            data.resource, 
            data.action,
            { ip: data.ip, time: new Date() }
        );
    }

    @Post('simulate')
    async simulatePermissions(
        @Body() data: { userId: string; groupIds: string[] }
    ): Promise<{ resource: string; action: string; allowed: boolean }[]> {
        return this.rbacService.simulateUserPermissions(data.userId, data.groupIds);
    }
}
