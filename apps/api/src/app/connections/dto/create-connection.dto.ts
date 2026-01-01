
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsIn, IsArray } from 'class-validator';

export class CreateConnectionDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    @IsIn(['mysql', 'mariadb', 'postgres', 'postgresql', 'mssql', 'oracle', 'sqlite'])
    type: string;

    @IsNotEmpty()
    @IsString()
    host: string;

    @IsNotEmpty()
    @IsNumber()
    port: number;

    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    database?: string;

    @IsOptional()
    @IsIn(['private', 'team', 'public'])
    visibility?: 'private' | 'team' | 'public';

    @IsOptional()
    @IsArray()
    sharedWith?: string[];
}

