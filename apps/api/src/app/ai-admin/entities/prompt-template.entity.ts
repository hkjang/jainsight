import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AiExecutionLog } from './ai-execution-log.entity';

export type PromptPurpose = 'nl2sql' | 'explain' | 'optimize' | 'validate';

@Entity('prompt_template')
export class PromptTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ default: 1 })
    version: number;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', nullable: true })
    variables: string; // JSON array of variable definitions

    @Column({ type: 'varchar', length: 20, default: 'nl2sql' })
    purpose: PromptPurpose;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isApproved: boolean;

    @Column({ nullable: true })
    approvedBy: string;

    @Column({ nullable: true })
    approvedAt: Date;

    @Column({ nullable: true })
    parentId: string; // Reference to previous version

    @Column({ nullable: true })
    description: string;

    @OneToMany(() => AiExecutionLog, log => log.promptTemplate)
    executionLogs: AiExecutionLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
