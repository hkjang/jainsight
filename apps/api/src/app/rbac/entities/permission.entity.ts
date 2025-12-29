
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type ResourceScope = 'system' | 'organization' | 'database' | 'schema' | 'table' | 'query';
export type PermissionAction = 'read' | 'execute' | 'modify' | 'delete' | 'admin';

export interface PermissionCondition {
    type: 'time' | 'ip' | 'mfa' | 'custom';
    config: {
        // Time-based conditions
        allowedDays?: number[];
        allowedHoursStart?: number;
        allowedHoursEnd?: number;
        timezone?: string;
        // IP-based conditions
        allowedIps?: string[];
        deniedIps?: string[];
        // MFA requirement
        requireMfa?: boolean;
        // Custom condition (for extensibility)
        expression?: string;
    };
}

@Entity()
export class Permission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    roleId: string;

    @Column({ type: 'varchar' })
    scope: ResourceScope;

    @Column()
    resource: string; // Pattern: '*' | 'db:*' | 'db:mydb' | 'schema:mydb.public' | 'table:mydb.public.users' | 'query:uuid'

    @Column({ type: 'varchar' })
    action: PermissionAction;

    @Column({ default: true })
    isAllow: boolean; // true = allow, false = deny

    @Column({ type: 'simple-json', nullable: true })
    conditions: PermissionCondition[];

    @CreateDateColumn()
    createdAt: Date;
}
