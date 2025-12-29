
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class QueryVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    queryId: string;

    @Column()
    version: number;

    @Column('text')
    query: string;

    @Column({ nullable: true })
    changeDescription: string;

    @Column()
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;
}
