import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { User, UserStatus, AccountSource, UserPreferences } from './entities/user.entity';
import { UserActivity, ActivityAction } from './entities/user-activity.entity';
import { randomBytes } from 'crypto';

export interface UserListOptions {
    status?: UserStatus;
    accountSource?: AccountSource;
    organizationId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(UserActivity)
        private activityRepository: Repository<UserActivity>,
    ) { }

    // Basic Operations
    async findOneByEmail(email: string): Promise<User | undefined> {
        const user = await this.usersRepository.findOne({ where: { email } });
        return user ?? undefined;
    }

    async findOneById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    async create(user: Partial<User>): Promise<User> {
        const newUser = this.usersRepository.create(user);
        return this.usersRepository.save(newUser);
    }

    // Admin Operations
    async findAll(options: UserListOptions = {}): Promise<{ users: User[]; total: number }> {
        const where: Record<string, unknown> = {};
        
        if (options.status) where.status = options.status;
        if (options.accountSource) where.accountSource = options.accountSource;
        if (options.organizationId) where.organizationId = options.organizationId;

        const qb = this.usersRepository.createQueryBuilder('user');
        
        if (options.search) {
            qb.where('(user.name LIKE :search OR user.email LIKE :search)', { 
                search: `%${options.search}%` 
            });
        }
        
        if (options.status) qb.andWhere('user.status = :status', { status: options.status });
        if (options.organizationId) qb.andWhere('user.organizationId = :orgId', { orgId: options.organizationId });

        const total = await qb.getCount();
        
        qb.orderBy('user.createdAt', 'DESC')
            .take(options.limit || 50)
            .skip(options.offset || 0);

        const users = await qb.getMany();
        return { users, total };
    }

    async updateStatus(userId: string, status: UserStatus, lockReason?: string): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        user.status = status;
        if (status === 'locked' && lockReason) {
            user.lockReason = lockReason;
            user.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default
        } else if (status === 'active') {
            user.lockReason = undefined;
            user.lockedUntil = undefined;
            user.failedLoginAttempts = 0;
        }

        return this.usersRepository.save(user);
    }

    async bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<number> {
        const result = await this.usersRepository.update(
            { id: In(userIds) },
            { status }
        );
        return result.affected || 0;
    }

    async inviteUser(email: string, name: string, invitedBy: string, organizationId?: string): Promise<User> {
        const existing = await this.findOneByEmail(email);
        if (existing) throw new BadRequestException('User with this email already exists');

        const inviteToken = randomBytes(32).toString('hex');
        const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const user = this.usersRepository.create({
            email,
            name,
            password: '', // Will be set when user accepts invite
            role: 'user',
            status: 'invited',
            accountSource: 'local',
            invitedBy,
            inviteToken,
            inviteExpiresAt,
            organizationId
        });

        return this.usersRepository.save(user);
    }

    async resendInvite(userId: string): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');
        if (user.status !== 'invited') throw new BadRequestException('User is not in invited status');

        user.inviteToken = randomBytes(32).toString('hex');
        user.inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        return this.usersRepository.save(user);
    }

    async unlockUser(userId: string): Promise<User> {
        return this.updateStatus(userId, 'active');
    }

    async lockUser(userId: string, reason: string): Promise<User> {
        return this.updateStatus(userId, 'locked', reason);
    }

    async deleteUser(userId: string): Promise<void> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        // Soft delete - just mark as deleted
        user.status = 'deleted';
        await this.usersRepository.save(user);
    }

    async forceLogout(userId: string): Promise<void> {
        // In a real implementation, this would invalidate the user's sessions
        // For now, we just update the lastLoginAt to force re-authentication
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');
        
        // Could also store a "logoutAt" timestamp to invalidate tokens issued before this time
        await this.usersRepository.update(userId, { 
            passwordChangedAt: new Date() 
        });
    }

    async recordLogin(userId: string, ip: string): Promise<void> {
        await this.usersRepository.update(userId, {
            lastLoginAt: new Date(),
            lastLoginIp: ip,
            failedLoginAttempts: 0
        });
    }

    async recordFailedLogin(userId: string): Promise<boolean> {
        const user = await this.findOneById(userId);
        if (!user) return false;

        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        
        // Auto-lock after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
            user.status = 'locked';
            user.lockReason = '로그인 5회 실패';
            user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await this.usersRepository.save(user);
        return user.status === 'locked';
    }

    async resetPassword(userId: string): Promise<{ tempPassword: string }> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        // Generate temporary password
        const tempPassword = randomBytes(8).toString('hex');
        
        // In production, you would hash this password before storing
        // For now, we'll store a hash indicator and return the temp password
        const bcrypt = await import('bcrypt');
        user.password = await bcrypt.hash(tempPassword, 10);
        user.passwordChangedAt = new Date();
        
        // Force user to change password on next login (could add a flag for this)
        await this.usersRepository.save(user);
        
        return { tempPassword };
    }

    async updateUser(userId: string, data: { name?: string; email?: string; role?: string }): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (data.email && data.email !== user.email) {
            const existing = await this.findOneByEmail(data.email);
            if (existing) throw new BadRequestException('Email already in use');
            user.email = data.email;
        }

        if (data.name) user.name = data.name;
        if (data.role) user.role = data.role;

        return this.usersRepository.save(user);
    }

    async getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        bySource: Record<string, number>;
        recentLogins: number;
    }> {
        const total = await this.usersRepository.count();
        
        const statusCounts = await this.usersRepository
            .createQueryBuilder('user')
            .select('user.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.status')
            .getRawMany();

        const sourceCounts = await this.usersRepository
            .createQueryBuilder('user')
            .select('user.accountSource', 'source')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.accountSource')
            .getRawMany();

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogins = await this.usersRepository.count({
            where: { lastLoginAt: MoreThanOrEqual(oneDayAgo) }
        });

        return {
            total,
            byStatus: Object.fromEntries(statusCounts.map(s => [s.status, parseInt(s.count)])),
            bySource: Object.fromEntries(sourceCounts.map(s => [s.source, parseInt(s.count)])),
            recentLogins
        };
    }

    // Profile Management
    async getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string;
        avatarUrl?: string;
        bio?: string;
        jobTitle?: string;
        role: string;
        status: UserStatus;
        accountSource: AccountSource;
        lastLoginAt?: Date;
        createdAt: Date;
    }> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');
        
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            jobTitle: user.jobTitle,
            role: user.role,
            status: user.status,
            accountSource: user.accountSource,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
        };
    }

    async updateProfile(userId: string, data: {
        name?: string;
        avatarUrl?: string;
        bio?: string;
        jobTitle?: string;
    }): Promise<User> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (data.name) user.name = data.name;
        if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
        if (data.bio !== undefined) user.bio = data.bio;
        if (data.jobTitle !== undefined) user.jobTitle = data.jobTitle;

        return this.usersRepository.save(user);
    }

    // Preferences Management
    async getPreferences(userId: string): Promise<UserPreferences> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');
        
        // Return stored preferences or defaults
        return user.preferences || {
            theme: 'system',
            language: 'ko',
            timezone: 'Asia/Seoul',
            notifications: {
                email: true,
                browser: true,
                queryResults: true,
                systemAlerts: true
            },
            editor: {
                fontSize: 14,
                tabSize: 4,
                autoComplete: true,
                lineNumbers: true
            }
        };
    }

    async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        const currentPrefs = await this.getPreferences(userId);
        const newPrefs: UserPreferences = {
            ...currentPrefs,
            ...preferences,
            notifications: { ...currentPrefs.notifications, ...preferences.notifications },
            editor: { ...currentPrefs.editor, ...preferences.editor }
        };

        user.preferences = newPrefs;
        await this.usersRepository.save(user);
        
        return newPrefs;
    }

    // Activity Logging
    async logActivity(data: {
        userId: string;
        action: ActivityAction;
        details?: Record<string, unknown>;
        resourceType?: string;
        resourceId?: string;
        ipAddress?: string;
        userAgent?: string;
        sessionId?: string;
        success?: boolean;
        errorMessage?: string;
        durationMs?: number;
    }): Promise<UserActivity> {
        const activity = this.activityRepository.create({
            ...data,
            success: data.success ?? true
        });
        return this.activityRepository.save(activity);
    }

    async getActivityLog(userId: string, options: {
        action?: ActivityAction;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    } = {}): Promise<{ activities: UserActivity[]; total: number }> {
        const qb = this.activityRepository.createQueryBuilder('activity')
            .where('activity.userId = :userId', { userId })
            .orderBy('activity.createdAt', 'DESC');

        if (options.action) {
            qb.andWhere('activity.action = :action', { action: options.action });
        }
        if (options.startDate) {
            qb.andWhere('activity.createdAt >= :startDate', { startDate: options.startDate });
        }
        if (options.endDate) {
            qb.andWhere('activity.createdAt <= :endDate', { endDate: options.endDate });
        }

        const total = await qb.getCount();
        
        qb.take(options.limit || 50).skip(options.offset || 0);
        const activities = await qb.getMany();

        return { activities, total };
    }

    // User Dashboard
    async getDashboard(userId: string): Promise<{
        profile: {
            name: string;
            email: string;
            avatarUrl?: string;
            role: string;
        };
        stats: {
            queriesExecuted: number;
            reportsViewed: number;
            lastLoginAt?: Date;
            accountAge: number; // days
        };
        recentActivity: UserActivity[];
    }> {
        const user = await this.findOneById(userId);
        if (!user) throw new NotFoundException('User not found');

        // Get activity stats
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const queriesExecuted = await this.activityRepository.count({
            where: { userId, action: 'query_execute' as ActivityAction }
        });

        const reportsViewed = await this.activityRepository.count({
            where: { userId, action: 'report_view' as ActivityAction }
        });

        // Get recent activity
        const recentActivity = await this.activityRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 10
        });

        const accountAge = Math.floor(
            (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000)
        );

        return {
            profile: {
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                role: user.role
            },
            stats: {
                queriesExecuted,
                reportsViewed,
                lastLoginAt: user.lastLoginAt,
                accountAge
            },
            recentActivity
        };
    }
}
