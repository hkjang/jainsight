
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system';

@Entity()
@Index(['userId', 'isRead'])
export class UserNotification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ default: 'info' })
    type: NotificationType;

    @Column({ nullable: true })
    link: string;

    @Column({ nullable: true })
    icon: string;

    @Column({ default: false })
    isRead: boolean;

    @Column({ nullable: true })
    readAt: Date;

    @Column({ nullable: true })
    category: string; // 'query', 'report', 'security', 'system'

    @Column({ type: 'simple-json', nullable: true })
    metadata: Record<string, unknown>;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
