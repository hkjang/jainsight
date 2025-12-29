
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class UserGroup {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    groupId: string;

    @Column({ nullable: true })
    addedBy: string;

    @Column({ default: false })
    isAutoAssigned: boolean; // True if added by auto-group rules

    @CreateDateColumn()
    addedAt: Date;
}
