
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ConnectionVisibility {
    PRIVATE = 'private',   // Only owner can access
    TEAM = 'team',         // Shared with specific users
    PUBLIC = 'public',     // All authenticated users
}

@Entity()
export class Connection {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column()
    host: string;

    @Column()
    port: number;

    @Column()
    username: string;

    // TODO: Encrypt this field
    @Column()
    password: string;

    @Column({ nullable: true })
    database: string;

    // Owner of this connection
    @Column({ nullable: true })
    createdBy: string;

    // Visibility level
    @Column({ type: 'varchar', default: ConnectionVisibility.PUBLIC })
    visibility: ConnectionVisibility;

    // User IDs this connection is shared with (for 'team' visibility)
    @Column({ type: 'simple-array', nullable: true })
    sharedWith: string[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

