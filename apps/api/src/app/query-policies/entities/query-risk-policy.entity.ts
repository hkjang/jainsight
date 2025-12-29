
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type QueryPolicyType = 'ddl_block' | 'where_required' | 'limit_required' | 'keyword_block' | 'table_restrict' | 'custom';
export type PolicyAction = 'warn' | 'block' | 'require_approval';

@Entity()
export class QueryRiskPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'varchar' })
    type: QueryPolicyType;

    @Column({ nullable: true })
    pattern: string; // Regex pattern for custom matching

    @Column({ type: 'simple-json', nullable: true })
    blockedKeywords: string[]; // DDL keywords like DROP, TRUNCATE, ALTER

    @Column({ type: 'simple-json', nullable: true })
    restrictedTables: string[]; // Tables that require special handling

    @Column({ default: 50 })
    riskScore: number; // 0-100 risk score

    @Column({ type: 'varchar', default: 'warn' })
    action: PolicyAction;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    organizationId: string;

    @Column({ nullable: true })
    connectionId: string; // null = applies to all connections

    @Column()
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
