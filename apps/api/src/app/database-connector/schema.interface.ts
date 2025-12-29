
export interface TableInfo {
    name: string;
    schema?: string;
    type: 'TABLE' | 'VIEW';
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
}
