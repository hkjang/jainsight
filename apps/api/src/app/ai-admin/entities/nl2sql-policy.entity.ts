import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('nl2sql_policy')
export class Nl2SqlPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'text', nullable: true })
    blockedKeywords: string; // JSON array: ["DROP", "DELETE", "TRUNCATE", "ALTER"]

    @Column({ type: 'text', nullable: true })
    allowedTables: string; // JSON array of allowed table patterns

    @Column({ type: 'text', nullable: true })
    deniedColumns: string; // JSON array of denied columns (PII)

    @Column({ default: 1000 })
    maxResultRows: number;

    @Column({ default: false })
    requireApproval: boolean;

    @Column({ default: false })
    blockDdl: boolean;

    @Column({ default: false })
    blockDml: boolean;

    @Column({ default: true })
    enableInjectionCheck: boolean;

    @Column({ default: true })
    enablePiiMasking: boolean;

    @Column({ nullable: true })
    description: string;

    @Column({ default: 1 })
    priority: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
