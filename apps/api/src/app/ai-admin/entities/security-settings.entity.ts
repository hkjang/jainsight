import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('security_settings')
export class SecuritySettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 'default' })
    organizationId: string;

    @Column({ default: true })
    enablePromptInjectionCheck: boolean;

    @Column({ default: true })
    enableSqlInjectionCheck: boolean;

    @Column({ default: true })
    enableDdlBlock: boolean;

    @Column({ default: false })
    enableDmlBlock: boolean;

    @Column({ default: true })
    enablePiiMasking: boolean;

    @Column({ default: 1000 })
    maxResultRows: number;

    @Column({ type: 'text', nullable: true })
    blockedKeywords: string; // JSON string array

    @Column({ type: 'text', nullable: true })
    piiColumns: string; // JSON string array

    @Column({ default: true })
    enableRateLimiting: boolean;

    @Column({ default: 60 })
    maxRequestsPerMinute: number;

    @Column({ default: true })
    enableAuditLog: boolean;

    @Column({ default: 90 })
    retentionDays: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
