import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CreateAiProviderDto {
    @IsString()
    name: string;

    @IsEnum(['vllm', 'ollama', 'openai'])
    type: 'vllm' | 'ollama' | 'openai';

    @IsString()
    endpoint: string;

    @IsOptional()
    @IsString()
    apiKey?: string;

    @IsOptional()
    @IsNumber()
    @Min(1000)
    @Max(120000)
    timeoutMs?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(10)
    retryCount?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsNumber()
    priority?: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateAiProviderDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    endpoint?: string;

    @IsOptional()
    @IsString()
    apiKey?: string;

    @IsOptional()
    @IsNumber()
    timeoutMs?: number;

    @IsOptional()
    @IsNumber()
    retryCount?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsNumber()
    priority?: number;

    @IsOptional()
    @IsString()
    description?: string;
}
