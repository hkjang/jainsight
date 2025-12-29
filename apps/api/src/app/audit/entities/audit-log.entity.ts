
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    connectionId: string;

    @Column()
    connectionName: string;

    @Column('text')
    query: string;

    @Column()
    status: 'SUCCESS' | 'FAILURE';

    @Column({ nullable: true })
    rowCount: number;

    @Column()
    durationMs: number;

    @Column({ nullable: true })
    errorMessage: string;

    @Column({ default: 'Anonymous' })
    executedBy: string;

    @CreateDateColumn()
    executedAt: Date;
}
