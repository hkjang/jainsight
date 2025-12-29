
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type ExecutionStatus = 'success' | 'failed' | 'blocked' | 'pending_approval';

@Entity()
export class QueryExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    queryId: string; // Reference to SavedQuery if applicable

    @Column('text')
    rawQuery: string;

    @Column({ type: 'simple-json', nullable: true })
    parameters: Record<string, unknown>;

    @Column()
    executedBy: string;

    @Column()
    connectionId: string;

    @Column({ nullable: true })
    connectionName: string;

    @Column({ type: 'varchar', default: 'success' })
    status: ExecutionStatus;

    @Column({ nullable: true })
    rowCount: number;

    @Column({ nullable: true })
    durationMs: number;

    @Column({ default: 0 })
    riskScore: number;

    @Column({ nullable: true })
    blockedReason: string;

    @Column({ nullable: true })
    blockedByPolicyId: string;

    @Column({ nullable: true })
    approvedBy: string;

    @Column({ nullable: true })
    approvedAt: Date;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @CreateDateColumn()
    executedAt: Date;
}
