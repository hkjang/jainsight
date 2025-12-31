
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export type ActivityAction = 
    | 'login'
    | 'logout'
    | 'login_failed'
    | 'query_execute'
    | 'query_save'
    | 'report_view'
    | 'report_export'
    | 'settings_update'
    | 'password_change'
    | 'profile_update'
    | 'api_key_create'
    | 'api_key_revoke'
    | 'connection_create'
    | 'connection_test';

@Entity()
@Index(['userId', 'createdAt'])
export class UserActivity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column({ type: 'varchar' })
    action: ActivityAction;

    @Column({ type: 'simple-json', nullable: true })
    details: Record<string, unknown>;

    @Column({ nullable: true })
    resourceType: string; // 'query' | 'report' | 'connection' | 'api_key' etc.

    @Column({ nullable: true })
    resourceId: string;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    userAgent: string;

    @Column({ nullable: true })
    sessionId: string;

    @Column({ default: true })
    success: boolean;

    @Column({ nullable: true })
    errorMessage: string;

    @Column({ nullable: true })
    durationMs: number;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
