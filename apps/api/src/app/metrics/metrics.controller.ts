import { Controller, Get, Header, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus format metrics',
  })
  getPrometheusMetrics(): string {
    return this.metricsService.getPrometheusMetrics();
  }

  @Get('json')
  @ApiOperation({ summary: 'JSON metrics endpoint' })
  @ApiResponse({
    status: 200,
    description: 'JSON format metrics with detailed stats',
  })
  getJsonMetrics() {
    return this.metricsService.getJsonMetrics();
  }
}
