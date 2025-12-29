
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class SavedQuery {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column('text')
    query: string;

    @Column()
    userId: string;

    @Column()
    userName: string; // Store name for display purposes

    @Column({ default: false })
    isPublic: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
