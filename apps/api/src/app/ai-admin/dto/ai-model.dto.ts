import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsUUID, Min, Max } from 'class-validator';

export class CreateAiModelDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    version?: string;

    @IsString()
    modelId: string;

    @IsUUID()
    providerId: string;

    @IsOptional()
    @IsEnum(['sql', 'explain', 'general'])
    purpose?: 'sql' | 'explain' | 'general';

    @IsOptional()
    @IsNumber()
    @Min(128)
    @Max(128000)
    maxTokens?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(2)
    temperature?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    topP?: number;

    @IsOptional()
    @IsString()
    systemPrompt?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateAiModelDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    version?: string;

    @IsOptional()
    @IsString()
    modelId?: string;

    @IsOptional()
    @IsUUID()
    providerId?: string;

    @IsOptional()
    @IsEnum(['sql', 'explain', 'general'])
    purpose?: 'sql' | 'explain' | 'general';

    @IsOptional()
    @IsNumber()
    maxTokens?: number;

    @IsOptional()
    @IsNumber()
    temperature?: number;

    @IsOptional()
    @IsNumber()
    topP?: number;

    @IsOptional()
    @IsString()
    systemPrompt?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    description?: string;
}
