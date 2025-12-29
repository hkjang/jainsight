
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type GroupType = 'organization' | 'project' | 'task';

export interface AutoGroupCondition {
    field: string; // 'email', 'department', 'role', etc.
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
}

@Entity()
export class Group {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'varchar', default: 'project' })
    type: GroupType;

    @Column({ nullable: true })
    parentId: string; // For hierarchical group structure

    @Column()
    organizationId: string;

    @Column({ nullable: true })
    ownerId: string; // Group owner/responsible person

    @Column({ default: false })
    isAutoGroup: boolean;

    @Column({ type: 'simple-json', nullable: true })
    autoConditions: AutoGroupCondition[]; // Conditions for auto-group membership

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    iconName: string;

    @Column({ nullable: true })
    color: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
