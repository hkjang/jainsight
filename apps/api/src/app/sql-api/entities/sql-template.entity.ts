
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class SqlTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column('text')
    sql: string;

    @Column('simple-json', { nullable: true })
    parameters: {
        name: string;
        type: 'string' | 'number' | 'boolean' | 'date';
        required: boolean;
        defaultValue?: any;
    }[];

    @Column()
    connectionId: string;

    @Column()
    apiKey: string;

    @Column('simple-json', { nullable: true })
    config: {
        timeout?: number;
        maxRows?: number;
    };

    @Column('simple-json', { nullable: true })
    visualization: {
        type: 'bar' | 'line' | 'area' | 'pie';
        xAxis: string;
        dataKeys: string[];
    };

    @Column({ nullable: true })
    cacheTtl: number; // Seconds

    // New fields for enhanced functionality
    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 1 })
    version: number;

    @Column({ default: 0 })
    usageCount: number;

    @Column({ nullable: true })
    lastUsedAt: Date;

    @Column('simple-json', { nullable: true })
    rateLimit: {
        requests: number;
        windowSeconds: number;
    };

    @Column({ nullable: true })
    createdBy: string;

    @Column({ nullable: true })
    method: string; // GET, POST, etc.

    // RBAC Sharing Fields
    @Column({ default: 'private' })
    visibility: 'private' | 'group' | 'public'; // private = owner only, group = shared with specific groups, public = all users

    @Column('simple-json', { nullable: true })
    sharedWithGroups: string[]; // Array of group IDs

    @Column({ nullable: true })
    ownerId: string; // User ID who created/owns this API

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

