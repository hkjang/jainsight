import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../../metrics/metrics.service';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    @Optional()
    @Inject(MetricsService)
    private readonly metricsService?: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const correlationId = request.headers[CORRELATION_ID_HEADER] as string;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          // Normalize path for metrics (remove query params and ids)
          const normalizedPath = this.normalizePath(url);

          // Record metrics if service is available
          if (this.metricsService) {
            this.metricsService.recordRequest(method, normalizedPath, statusCode);
            this.metricsService.recordResponseTime(duration);
          }

          const logMessage = `${method} ${url} ${statusCode} ${duration}ms [${correlationId || 'no-id'}]`;

          if (statusCode >= 400) {
            this.logger.warn(`${logMessage} - ${ip} "${userAgent}"`);
          } else {
            this.logger.log(`${logMessage} - ${ip} "${userAgent}"`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Normalize path for metrics
          const normalizedPath = this.normalizePath(url);

          // Record metrics if service is available
          if (this.metricsService) {
            this.metricsService.recordRequest(method, normalizedPath, statusCode);
            this.metricsService.recordResponseTime(duration);
          }

          this.logger.error(
            `${method} ${url} ${statusCode} ${duration}ms [${correlationId || 'no-id'}] - ${ip} "${userAgent}"`,
            error.stack,
          );
        },
      }),
    );
  }

  private normalizePath(url: string): string {
    // Remove query params
    let path = url.split('?')[0];
    // Replace numeric IDs with :id placeholder
    path = path.replace(/\/\d+/g, '/:id');
    // Replace UUIDs with :uuid placeholder
    path = path.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:uuid',
    );
    return path;
  }
}
