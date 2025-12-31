
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { UsersService, UserListOptions } from './users.service';
import { User, UserStatus, UserPreferences } from './entities/user.entity';
import { UserActivity, ActivityAction } from './entities/user-activity.entity';
import { UserNotification } from './entities/user-notification.entity';
import { UserFavorite, FavoriteType } from './entities/user-favorite.entity';
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

    @Post(':id/reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Param('id') id: string): Promise<{ tempPassword: string }> {
        return this.usersService.resetPassword(id);
    }

    @Put(':id')
    async updateUser(
        @Param('id') id: string,
        @Body() data: { name?: string; email?: string; role?: string }
    ): Promise<User> {
        return this.usersService.updateUser(id, data);
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

    // Profile Endpoints
    @Get(':id/profile')
    async getProfile(@Param('id') id: string) {
        return this.usersService.getProfile(id);
    }

    @Put(':id/profile')
    async updateProfile(
        @Param('id') id: string,
        @Body() data: { name?: string; avatarUrl?: string; bio?: string; jobTitle?: string }
    ): Promise<User> {
        return this.usersService.updateProfile(id, data);
    }

    // Preferences Endpoints
    @Get(':id/preferences')
    async getPreferences(@Param('id') id: string): Promise<UserPreferences> {
        return this.usersService.getPreferences(id);
    }

    @Put(':id/preferences')
    async updatePreferences(
        @Param('id') id: string,
        @Body() data: Partial<UserPreferences>
    ): Promise<UserPreferences> {
        return this.usersService.updatePreferences(id, data);
    }

    // Activity Endpoints
    @Get(':id/activity')
    async getActivityLog(
        @Param('id') id: string,
        @Query('action') action?: ActivityAction,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ): Promise<{ activities: UserActivity[]; total: number }> {
        return this.usersService.getActivityLog(id, {
            action,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined
        });
    }

    // Dashboard Endpoint
    @Get(':id/dashboard')
    async getDashboard(@Param('id') id: string) {
        return this.usersService.getDashboard(id);
    }

    // Security Endpoints
    @Post(':id/change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @Param('id') id: string,
        @Body() data: { currentPassword: string; newPassword: string }
    ): Promise<{ success: boolean; message: string }> {
        return this.usersService.changePassword(id, data.currentPassword, data.newPassword);
    }

    @Get(':id/sessions')
    async getSessions(@Param('id') id: string) {
        return this.usersService.getSessions(id);
    }

    @Delete(':id/sessions/:sessionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async terminateSession(
        @Param('id') id: string,
        @Param('sessionId') sessionId: string
    ): Promise<void> {
        return this.usersService.terminateSession(id, sessionId);
    }

    @Delete(':id/sessions')
    @HttpCode(HttpStatus.OK)
    async terminateAllSessions(
        @Param('id') id: string,
        @Body() data: { exceptCurrentSession?: string }
    ): Promise<{ terminated: number }> {
        const terminated = await this.usersService.terminateAllSessions(id, data.exceptCurrentSession);
        return { terminated };
    }

    @Get(':id/security')
    async getSecurityInfo(@Param('id') id: string) {
        return this.usersService.getSecurityInfo(id);
    }

    // Notification Endpoints
    @Get(':id/notifications')
    async getNotifications(
        @Param('id') id: string,
        @Query('unreadOnly') unreadOnly?: string,
        @Query('category') category?: string,
        @Query('limit') limit?: string
    ) {
        return this.usersService.getNotifications(id, {
            unreadOnly: unreadOnly === 'true',
            category,
            limit: limit ? parseInt(limit, 10) : undefined
        });
    }

    @Post(':id/notifications/:notificationId/read')
    @HttpCode(HttpStatus.NO_CONTENT)
    async markNotificationRead(
        @Param('id') id: string,
        @Param('notificationId') notificationId: string
    ): Promise<void> {
        return this.usersService.markNotificationRead(id, notificationId);
    }

    @Post(':id/notifications/read-all')
    @HttpCode(HttpStatus.OK)
    async markAllNotificationsRead(@Param('id') id: string): Promise<{ marked: number }> {
        const marked = await this.usersService.markAllNotificationsRead(id);
        return { marked };
    }

    @Delete(':id/notifications/:notificationId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteNotification(
        @Param('id') id: string,
        @Param('notificationId') notificationId: string
    ): Promise<void> {
        return this.usersService.deleteNotification(id, notificationId);
    }

    // Favorites Endpoints
    @Get(':id/favorites')
    async getFavorites(
        @Param('id') id: string,
        @Query('type') itemType?: FavoriteType
    ): Promise<UserFavorite[]> {
        return this.usersService.getFavorites(id, itemType);
    }

    @Post(':id/favorites')
    async addFavorite(
        @Param('id') id: string,
        @Body() data: { itemType: FavoriteType; itemId: string; name?: string; description?: string }
    ): Promise<UserFavorite> {
        return this.usersService.addFavorite({ userId: id, ...data });
    }

    @Delete(':id/favorites/:itemType/:itemId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeFavorite(
        @Param('id') id: string,
        @Param('itemType') itemType: FavoriteType,
        @Param('itemId') itemId: string
    ): Promise<void> {
        return this.usersService.removeFavorite(id, itemType, itemId);
    }

    @Get(':id/favorites/:itemType/:itemId/check')
    async isFavorite(
        @Param('id') id: string,
        @Param('itemType') itemType: FavoriteType,
        @Param('itemId') itemId: string
    ): Promise<{ isFavorite: boolean }> {
        const result = await this.usersService.isFavorite(id, itemType, itemId);
        return { isFavorite: result };
    }

    // Profile Completion
    @Get(':id/profile-completion')
    async getProfileCompletion(@Param('id') id: string) {
        return this.usersService.getProfileCompletion(id);
    }
}
