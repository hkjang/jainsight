
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface PolicyPermissionDef {
    scope: string;
    resource: string;
    action: string;
    isAllow: boolean;
}

@Entity()
export class RbacPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ default: false })
    isTemplate: boolean; // Can be reused as template

    @Column({ type: 'simple-json', nullable: true })
    permissions: PolicyPermissionDef[];

    @Column({ type: 'simple-json', nullable: true })
    conditions: Record<string, unknown>; // Global conditions for the policy

    @Column({ nullable: true })
    organizationId: string;

    @Column()
    createdBy: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
