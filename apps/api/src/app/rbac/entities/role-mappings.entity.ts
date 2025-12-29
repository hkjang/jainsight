
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

@Entity()
export class UserRole {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    roleId: string;

    @Column({ default: false })
    isTemporary: boolean;

    @Column({ nullable: true })
    expiresAt: Date;

    @Column()
    grantedBy: string;

    @Column({ type: 'varchar', default: 'approved' })
    approvalStatus: ApprovalStatus;

    @Column({ nullable: true })
    approvalReason: string;

    @CreateDateColumn()
    grantedAt: Date;
}

@Entity()
export class GroupRole {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    groupId: string;

    @Column()
    roleId: string;

    @Column()
    grantedBy: string;

    @CreateDateColumn()
    grantedAt: Date;
}

@Entity()
export class RoleResource {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    roleId: string;

    @Column()
    resourceType: string; // 'database' | 'api' | 'query' | etc.

    @Column()
    resourceId: string;

    @Column({ type: 'simple-json', nullable: true })
    allowedActions: string[];

    @CreateDateColumn()
    createdAt: Date;
}
