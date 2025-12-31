
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export type FavoriteType = 'query' | 'report' | 'connection' | 'dashboard';

@Entity()
@Index(['userId', 'itemType', 'itemId'], { unique: true })
export class UserFavorite {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    itemType: FavoriteType;

    @Column()
    itemId: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    icon: string;

    @Column({ type: 'simple-json', nullable: true })
    metadata: Record<string, unknown>;

    @Column({ default: 0 })
    sortOrder: number;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;
}
