import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Connection } from '../../connections/entities/connection.entity';

/**
 * 테이블/컬럼 한글 번역 저장 엔티티
 * AI 또는 수동으로 입력된 번역을 저장
 */
@Entity('table_translations')
@Unique(['connectionId', 'tableName'])
export class TableTranslation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'connection_id' })
    connectionId: string;

    @ManyToOne(() => Connection, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'connection_id' })
    connection: Connection;

    @Column({ name: 'table_name' })
    tableName: string;

    @Column({ name: 'korean_name', nullable: true })
    koreanName: string;

    @Column({ name: 'korean_description', nullable: true })
    koreanDescription: string;

    @Column({ name: 'is_ai_generated', default: true })
    isAiGenerated: boolean;

    @Column({ name: 'column_translations', type: 'json', nullable: true })
    columnTranslations: Record<string, string>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
