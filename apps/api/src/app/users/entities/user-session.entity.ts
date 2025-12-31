
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity()
@Index(['userId', 'isActive'])
export class UserSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    sessionToken: string;

    @Column({ nullable: true })
    deviceName: string;

    @Column({ nullable: true })
    deviceType: string; // 'desktop' | 'mobile' | 'tablet'

    @Column({ nullable: true })
    browser: string;

    @Column({ nullable: true })
    os: string;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    location: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    lastActivityAt: Date;

    @Column({ nullable: true })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
