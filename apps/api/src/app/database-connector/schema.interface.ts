
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
    defaultValue?: string;
    comment?: string; // Column description/Korean translation
}
