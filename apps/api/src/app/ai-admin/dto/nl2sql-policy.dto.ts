import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, Min } from 'class-validator';

export class CreateNl2SqlPolicyDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsArray()
    blockedKeywords?: string[];

    @IsOptional()
    @IsArray()
    allowedTables?: string[];

    @IsOptional()
    @IsArray()
    deniedColumns?: string[];

    @IsOptional()
    @IsNumber()
    @Min(1)
    maxResultRows?: number;

    @IsOptional()
    @IsBoolean()
    requireApproval?: boolean;

    @IsOptional()
    @IsBoolean()
    blockDdl?: boolean;

    @IsOptional()
    @IsBoolean()
    blockDml?: boolean;

    @IsOptional()
    @IsBoolean()
    enableInjectionCheck?: boolean;

    @IsOptional()
    @IsBoolean()
    enablePiiMasking?: boolean;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    priority?: number;
}

export class UpdateNl2SqlPolicyDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsArray()
    blockedKeywords?: string[];

    @IsOptional()
    @IsArray()
    allowedTables?: string[];

    @IsOptional()
    @IsArray()
    deniedColumns?: string[];

    @IsOptional()
    @IsNumber()
    maxResultRows?: number;

    @IsOptional()
    @IsBoolean()
    requireApproval?: boolean;

    @IsOptional()
    @IsBoolean()
    blockDdl?: boolean;

    @IsOptional()
    @IsBoolean()
    blockDml?: boolean;

    @IsOptional()
    @IsBoolean()
    enableInjectionCheck?: boolean;

    @IsOptional()
    @IsBoolean()
    enablePiiMasking?: boolean;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    priority?: number;
}
