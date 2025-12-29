
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class ApiKeyUsage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    apiKeyId: string;

    @Column()
    endpoint: string;

    @Column({ nullable: true })
    queryId: string;

    @Column()
    method: string;

    @Column({ nullable: true })
    statusCode: number;

    @Column({ nullable: true })
    durationMs: number;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @Column({ nullable: true })
    errorMessage: string;

    @CreateDateColumn()
    calledAt: Date;
}
