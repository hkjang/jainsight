
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column({ default: 'user' })
    type: 'admin' | 'user'; // 'admin' = system-wide, 'user' = personal

    @Column()
    name: string;

    @Column()
    keyHash: string; // bcrypt hashed key

    @Column()
    keyPrefix: string; // First 8 chars for display (e.g., "jai_xxxx...")

    @Column({ type: 'simple-json', nullable: true })
    scopes: string[]; // Query IDs or patterns like 'query:*', 'query:uuid'

    @Column({ type: 'simple-json', nullable: true })
    allowedIps: string[]; // IP whitelist

    @Column({ default: 60 })
    rateLimit: number; // Calls per minute

    @Column({ nullable: true })
    expiresAt: Date;

    @Column({ nullable: true })
    lastUsedAt: Date;

    @Column({ default: 0 })
    usageCount: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    revokedAt: Date;

    @Column({ nullable: true })
    revokedBy: string;

    @Column({ nullable: true })
    revokeReason: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
