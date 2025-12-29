import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AiModel } from './ai-model.entity';
import { AiExecutionLog } from './ai-execution-log.entity';

export type AiProviderType = 'vllm' | 'ollama' | 'openai';

@Entity('ai_provider')
export class AiProvider {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'varchar', length: 20 })
    type: AiProviderType;

    @Column()
    endpoint: string;

    @Column({ nullable: true })
    apiKey: string;

    @Column({ default: 30000 })
    timeoutMs: number;

    @Column({ default: 3 })
    retryCount: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 1 })
    priority: number;

    @Column({ nullable: true })
    description: string;

    @OneToMany(() => AiModel, model => model.provider)
    models: AiModel[];

    @OneToMany(() => AiExecutionLog, log => log.provider)
    executionLogs: AiExecutionLog[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
