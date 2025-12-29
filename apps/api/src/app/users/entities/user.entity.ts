
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export type UserStatus = 'invited' | 'active' | 'locked' | 'deleted';
export type AccountSource = 'local' | 'sso' | 'ldap' | 'ad';

export interface AccessTimePolicy {
    enabled: boolean;
    allowedDays: number[]; // 0-6, Sunday-Saturday
    allowedHoursStart: number; // 0-23
    allowedHoursEnd: number; // 0-23
    timezone: string;
}

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string; // Hashed

    @Column()
    name: string;

    @Column({ default: 'user' })
    role: string; // Legacy field - will be deprecated after RBAC migration

    // New fields for enterprise user management
    @Column({ type: 'varchar', default: 'active' })
    status: UserStatus;

    @Column({ type: 'varchar', default: 'local' })
    accountSource: AccountSource;

    @Column({ nullable: true })
    organizationId: string;

    @Column({ type: 'simple-json', nullable: true })
    accessTimePolicy: AccessTimePolicy;

    @Column({ nullable: true })
    externalId: string; // For SSO/LDAP/AD integration

    @Column({ nullable: true })
    lockReason: string;

    @Column({ nullable: true })
    invitedBy: string;

    @Column({ nullable: true })
    inviteToken: string;

    @Column({ nullable: true })
    inviteExpiresAt: Date;

    @Column({ nullable: true })
    lastLoginAt: Date;

    @Column({ nullable: true })
    lastLoginIp: string;

    @Column({ nullable: true })
    passwordChangedAt: Date;

    @Column({ default: 0 })
    failedLoginAttempts: number;

    @Column({ nullable: true })
    lockedUntil: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
