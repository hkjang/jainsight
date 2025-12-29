
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type GroupHistoryAction = 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed' | 'owner_changed';

@Entity()
export class GroupHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    groupId: string;

    @Column({ type: 'varchar' })
    action: GroupHistoryAction;

    @Column({ nullable: true })
    targetUserId: string; // For member_added/removed actions

    @Column({ type: 'simple-json', nullable: true })
    previousState: Record<string, unknown>;

    @Column({ type: 'simple-json', nullable: true })
    newState: Record<string, unknown>;

    @Column()
    performedBy: string;

    @CreateDateColumn()
    performedAt: Date;
}
