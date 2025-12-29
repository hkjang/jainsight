
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type RoleType = 'system' | 'custom';

@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'varchar', default: 'custom' })
    type: RoleType;

    @Column({ nullable: true })
    parentRoleId: string; // For role hierarchy/inheritance

    @Column({ default: 0 })
    priority: number; // Higher priority wins in conflicts

    @Column({ nullable: true })
    organizationId: string; // null for system-wide roles

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isDefault: boolean; // Default role for new users

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
