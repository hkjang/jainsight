
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type AuditCategory = 'login' | 'permission' | 'query' | 'api' | 'admin' | 'policy' | 'user' | 'group';

@Entity()
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Legacy fields (kept for backward compatibility)
    @Column({ nullable: true })
    connectionId: string;

    @Column({ nullable: true })
    connectionName: string;

    @Column({ type: 'text', nullable: true })
    query: string;

    @Column({ nullable: true })
    status: 'SUCCESS' | 'FAILURE';

    @Column({ nullable: true })
    rowCount: number;

    @Column({ nullable: true })
    durationMs: number;

    @Column({ nullable: true })
    errorMessage: string;

    @Column({ default: 'Anonymous' })
    executedBy: string;

    // New enterprise audit fields
    @Column({ type: 'varchar', default: 'query' })
    category: AuditCategory;

    @Column({ nullable: true })
    action: string; // 'login_success', 'role_assigned', 'query_blocked', etc.

    @Column({ nullable: true })
    resourceType: string; // 'user', 'group', 'role', 'query', 'connection', etc.

    @Column({ nullable: true })
    resourceId: string;

    @Column({ nullable: true })
    resourceName: string;

    @Column({ type: 'simple-json', nullable: true })
    previousState: Record<string, unknown>;

    @Column({ type: 'simple-json', nullable: true })
    newState: Record<string, unknown>;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @Column({ nullable: true })
    sessionId: string;

    @Column({ nullable: true })
    organizationId: string;

    @Column({ nullable: true })
    userId: string;

    @Column({ type: 'simple-json', nullable: true })
    metadata: Record<string, unknown>; // Additional context

    @CreateDateColumn()
    executedAt: Date;
}
