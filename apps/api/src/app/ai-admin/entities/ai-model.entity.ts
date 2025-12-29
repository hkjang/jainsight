import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AiProvider } from './ai-provider.entity';
import { AiExecutionLog } from './ai-execution-log.entity';

export type ModelPurpose = 'sql' | 'explain' | 'general';

@Entity('ai_model')
export class AiModel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    version: string;

    @Column()
    modelId: string; // actual model identifier (e.g., 'codellama:7b')

    @ManyToOne(() => AiProvider, provider => provider.models, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'providerId' })
    provider: AiProvider;

    @Column()
    providerId: string;

    @Column({ type: 'varchar', length: 20, default: 'general' })
    purpose: ModelPurpose;

    @Column({ default: 4096 })
    maxTokens: number;

    @Column({ type: 'float', default: 0.1 })
    temperature: number;

    @Column({ type: 'float', default: 0.9 })
    topP: number;

    @Column({ type: 'text', nullable: true })
    systemPrompt: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    description: string;

    @OneToMany(() => AiExecutionLog, log => log.model)
    executionLogs: AiExecutionLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
