
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { UsersService, UserListOptions } from './users.service';
import { User, UserStatus } from './entities/user.entity';
import { Request } from 'express';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async getUsers(
        @Query('status') status?: UserStatus,
        @Query('search') search?: string,
        @Query('organizationId') organizationId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ): Promise<{ users: User[]; total: number }> {
        const options: UserListOptions = {
            status,
            search,
            organizationId,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined
        };
        return this.usersService.findAll(options);
    }

    @Get('stats')
    async getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        bySource: Record<string, number>;
        recentLogins: number;
    }> {
        return this.usersService.getStats();
    }

    @Get(':id')
    async getUserById(@Param('id') id: string): Promise<User | null> {
        return this.usersService.findOneById(id);
    }

    @Post('invite')
    async inviteUser(
        @Body() data: { email: string; name: string; organizationId?: string },
        @Req() req: Request
    ): Promise<User> {
        // In a real app, extract invitedBy from JWT token
        const invitedBy = (req as unknown as { user?: { id?: string } }).user?.id || 'system';
        return this.usersService.inviteUser(data.email, data.name, invitedBy, data.organizationId);
    }

    @Post(':id/resend-invite')
    @HttpCode(HttpStatus.OK)
    async resendInvite(@Param('id') id: string): Promise<User> {
        return this.usersService.resendInvite(id);
    }

    @Post(':id/unlock')
    @HttpCode(HttpStatus.OK)
    async unlockUser(@Param('id') id: string): Promise<User> {
        return this.usersService.unlockUser(id);
    }

    @Post(':id/lock')
    @HttpCode(HttpStatus.OK)
    async lockUser(
        @Param('id') id: string,
        @Body() data: { reason: string }
    ): Promise<User> {
        return this.usersService.lockUser(id, data.reason);
    }

    @Post(':id/force-logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    async forceLogout(@Param('id') id: string): Promise<void> {
        return this.usersService.forceLogout(id);
    }

    @Put(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: UserStatus; reason?: string }
    ): Promise<User> {
        return this.usersService.updateStatus(id, data.status, data.reason);
    }

    @Post('bulk/status')
    async bulkUpdateStatus(
        @Body() data: { userIds: string[]; status: UserStatus }
    ): Promise<{ affected: number }> {
        const affected = await this.usersService.bulkUpdateStatus(data.userIds, data.status);
        return { affected };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteUser(@Param('id') id: string): Promise<void> {
        return this.usersService.deleteUser(id);
    }
}
