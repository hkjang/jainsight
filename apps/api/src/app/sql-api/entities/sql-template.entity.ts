
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
