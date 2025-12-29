import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsNumber, Min, Max } from 'class-validator';

export class CreatePromptTemplateDto {
    @IsString()
    name: string;

    @IsString()
    content: string;

    @IsOptional()
    @IsArray()
    variables?: string[];

    @IsOptional()
    @IsEnum(['nl2sql', 'explain', 'optimize', 'validate'])
    purpose?: 'nl2sql' | 'explain' | 'optimize' | 'validate';

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdatePromptTemplateDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsArray()
    variables?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    description?: string;
}

export class TestPromptDto {
    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    schema?: string;

    @IsOptional()
    @IsString()
    userQuery?: string;
}
