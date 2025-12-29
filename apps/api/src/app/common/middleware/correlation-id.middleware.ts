import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Use existing correlation ID or generate a new one
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();

    // Set correlation ID on request for downstream use
    req.headers[CORRELATION_ID_HEADER] = correlationId;

    // Add correlation ID to response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
