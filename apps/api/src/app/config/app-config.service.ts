import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // Server
  get port(): number {
    return this.configService.get<number>('PORT', 3333);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // CORS
  get corsOrigins(): string[] {
    const origins = this.configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
    return origins.split(',').map(o => o.trim());
  }

  // JWT
  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET', 'your-super-secret-key-change-in-production');
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '7d');
  }

  // Database
  get databasePath(): string {
    return this.configService.get<string>('DATABASE_PATH', 'jainsight.db');
  }

  // Rate Limiting
  get throttleTtl(): number {
    return this.configService.get<number>('THROTTLE_TTL', 60000);
  }

  get throttleLimit(): number {
    return this.configService.get<number>('THROTTLE_LIMIT', 60);
  }

  // Swagger
  get swaggerEnabled(): boolean {
    return this.configService.get<boolean>('SWAGGER_ENABLED', true);
  }

  // Logging
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'log');
  }
}
