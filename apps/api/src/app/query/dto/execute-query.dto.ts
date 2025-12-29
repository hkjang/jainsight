import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ExecuteQueryDto {
    @IsNotEmpty()
    @IsUUID()
    connectionId: string;

    @IsNotEmpty()
    @IsString()
    query: string;
}
