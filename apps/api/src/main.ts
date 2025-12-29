/**
 * JAInsight API Server
 * Enhanced with security, logging, validation, and documentation
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './app/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './app/common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for Swagger UI
  }));

  // Compression middleware
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false, // Don't expose target object
        value: false, // Don't expose value
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:4200',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  });

  // API prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('JAInsight API')
    .setDescription(`
      ## JAInsight API Documentation
      
      Enterprise-grade SQL management and AI-powered insights platform.
      
      ### Features
      - 🔐 JWT Authentication
      - 📊 Database Connection Management
      - 🤖 AI-powered SQL Generation
      - 📝 Query Auditing & Monitoring
      - 👥 Role-Based Access Control
      
      ### Authentication
      Most endpoints require JWT Bearer authentication.
      Use the \`/api/auth/login\` endpoint to obtain a token.
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Connections', 'Database connection management')
    .addTag('Query', 'SQL query execution')
    .addTag('AI', 'AI-powered features')
    .addTag('Audit', 'Audit logging')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'JAInsight API Docs',
  });

  // Start server
  const port = process.env.PORT || 3333;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 API Documentation: http://localhost:${port}/${globalPrefix}/docs`);
  Logger.log(`💚 Health Check: http://localhost:${port}/${globalPrefix}/health`);
}

bootstrap();
