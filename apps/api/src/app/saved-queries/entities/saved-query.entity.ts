
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type QueryStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'deprecated';
export type QueryVisibility = 'private' | 'group' | 'organization' | 'public';

@Entity()
export class SavedQuery {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column('text')
    query: string;

    @Column()
    userId: string;

    @Column()
    userName: string; // Store name for display purposes

    @Column({ default: false })
    isPublic: boolean;

    // New enterprise fields
    @Column({ type: 'varchar', default: 'draft' })
    status: QueryStatus;

    @Column({ nullable: true })
    ownerId: string; // Responsible person (may differ from creator)

    @Column({ type: 'simple-json', nullable: true })
    tags: string[];

    @Column({ type: 'varchar', default: 'private' })
    visibility: QueryVisibility;

    @Column({ type: 'simple-json', nullable: true })
    visibleToGroups: string[]; // Group IDs for group visibility

    @Column({ nullable: true })
    organizationId: string;

    @Column({ nullable: true })
    connectionId: string; // Associated database connection

    @Column({ default: 1 })
    version: number;

    @Column({ nullable: true })
    parentVersionId: string; // Previous version ID

    @Column({ default: 0 })
    riskScore: number;

    @Column({ nullable: true })
    approvedBy: string;

    @Column({ nullable: true })
    approvedAt: Date;

    @Column({ nullable: true })
    rejectedBy: string;

    @Column({ nullable: true })
    rejectedAt: Date;

    @Column({ nullable: true })
    rejectionReason: string;

    @Column({ default: 0 })
    executionCount: number;

    @Column({ nullable: true })
    lastExecutedAt: Date;

    @Column({ default: false })
    isFavorite: boolean;

    @Column({ default: false })
    isLibraryQuery: boolean; // Part of public library

    @Column({ nullable: true })
    deprecatedReason: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
