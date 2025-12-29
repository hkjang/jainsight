import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AiProvider } from './ai-provider.entity';
import { AiModel } from './ai-model.entity';
import { PromptTemplate } from './prompt-template.entity';

@Entity('ai_execution_log')
export class AiExecutionLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => AiProvider, provider => provider.executionLogs, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'providerId' })
    provider: AiProvider;

    @Column({ nullable: true })
    providerId: string;

    @ManyToOne(() => AiModel, model => model.executionLogs, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'modelId' })
    model: AiModel;

    @Column({ nullable: true })
    modelId: string;

    @ManyToOne(() => PromptTemplate, template => template.executionLogs, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'promptTemplateId' })
    promptTemplate: PromptTemplate;

    @Column({ nullable: true })
    promptTemplateId: string;

    @Column({ type: 'text', nullable: true })
    userInput: string;

    @Column({ type: 'text', nullable: true })
    fullPrompt: string;

    @Column({ type: 'text', nullable: true })
    generatedSql: string;

    @Column({ default: 0 })
    inputTokens: number;

    @Column({ default: 0 })
    outputTokens: number;

    @Column({ default: 0 })
    latencyMs: number;

    @Column({ default: true })
    success: boolean;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ nullable: true })
    userId: string;

    @Column({ nullable: true })
    connectionId: string;

    @Column({ default: false })
    wasBlocked: boolean;

    @Column({ nullable: true })
    blockReason: string;

    @CreateDateColumn()
    createdAt: Date;
}
