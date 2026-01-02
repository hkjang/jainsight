
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Group permission structure for RBAC
export interface GroupPermission {
    groupId: string;
    groupName?: string; // Optional: for display purposes
    canView: boolean;   // Can see the API in list and view details
    canEdit: boolean;   // Can modify SQL, parameters, settings
    canExecute: boolean; // Can call/test the API
}

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
    groupPermissions: GroupPermission[]; // Array of group permissions with view/edit/execute flags

    @Column({ nullable: true })
    ownerId: string; // User ID who created/owns this API

    // === Enhanced Analytics Fields ===
    @Column({ default: 0 })
    successCount: number;

    @Column({ default: 0 })
    errorCount: number;

    @Column({ type: 'float', default: 0 })
    avgLatency: number; // Average response time in ms

    @Column({ nullable: true })
    lastErrorAt: Date;

    @Column({ nullable: true, type: 'text' })
    lastErrorMessage: string;

    // === Tags & Categorization ===
    @Column('simple-json', { nullable: true })
    tags: string[]; // Array of tag strings for filtering

    // === Execution Config ===
    @Column({ nullable: true })
    timeout: number; // Query execution timeout in ms

    // === Deprecation Fields ===
    @Column({ nullable: true })
    deprecatedAt: Date;

    @Column({ nullable: true, type: 'text' })
    deprecatedMessage: string;

    // === Webhook Integration ===
    @Column({ nullable: true })
    webhookUrl: string;

    @Column('simple-json', { nullable: true })
    webhookEvents: ('success' | 'error' | 'all')[]; // Events to trigger webhook

    // === Security ===
    @Column('simple-json', { nullable: true })
    allowedOrigins: string[]; // CORS whitelist

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

