import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const correlationId = request.headers['x-correlation-id'] || this.generateCorrelationId();

    // Add correlation ID to request for downstream use
    request.headers['x-correlation-id'] = correlationId as string;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;
          
          const logMessage = `${method} ${url} ${statusCode} ${duration}ms`;
          
          if (statusCode >= 400) {
            this.logger.warn(`${logMessage} - ${ip} "${userAgent}"`);
          } else {
            this.logger.log(`${logMessage} - ${ip} "${userAgent}"`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          this.logger.error(
            `${method} ${url} ${statusCode} ${duration}ms - ${ip} "${userAgent}"`,
            error.stack,
          );
        },
      }),
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
