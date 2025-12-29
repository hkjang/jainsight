
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateConnectionDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    @IsIn(['mysql', 'mariadb', 'postgres', 'mssql', 'oracle', 'sqlite'])
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
}
