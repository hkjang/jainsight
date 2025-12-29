import { Injectable } from '@nestjs/common';

interface MetricCounter {
  name: string;
  help: string;
  value: number;
  labels?: Record<string, string>;
}

interface MetricGauge {
  name: string;
  help: string;
  value: number;
}

interface MetricHistogram {
  name: string;
  help: string;
  count: number;
  sum: number;
  buckets: { le: string; count: number }[];
}

@Injectable()
export class MetricsService {
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private readonly maxResponseTimesSampleSize = 1000;

  // Record HTTP request
  recordRequest(method: string, path: string, statusCode: number): void {
    const key = `${method}_${path}_${statusCode}`;
    const current = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, current + 1);
  }

  // Record response time
  recordResponseTime(durationMs: number): void {
    this.responseTimes.push(durationMs);
    // Keep only last N samples to prevent memory issues
    if (this.responseTimes.length > this.maxResponseTimesSampleSize) {
      this.responseTimes.shift();
    }
  }

  // Get all metrics in Prometheus format
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Process info
    lines.push('# HELP process_info Process information');
    lines.push('# TYPE process_info gauge');
    lines.push(`process_info{version="${process.version}",platform="${process.platform}"} 1`);

    // Process uptime
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

    // Memory metrics
    const memory = process.memoryUsage();
    lines.push('# HELP process_heap_bytes Process heap memory in bytes');
    lines.push('# TYPE process_heap_bytes gauge');
    lines.push(`process_heap_bytes{type="used"} ${memory.heapUsed}`);
    lines.push(`process_heap_bytes{type="total"} ${memory.heapTotal}`);

    lines.push('# HELP process_rss_bytes Process RSS memory in bytes');
    lines.push('# TYPE process_rss_bytes gauge');
    lines.push(`process_rss_bytes ${memory.rss}`);

    // CPU metrics
    const cpu = process.cpuUsage();
    lines.push('# HELP process_cpu_microseconds CPU usage in microseconds');
    lines.push('# TYPE process_cpu_microseconds gauge');
    lines.push(`process_cpu_microseconds{type="user"} ${cpu.user}`);
    lines.push(`process_cpu_microseconds{type="system"} ${cpu.system}`);

    // HTTP request counts
    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    this.requestCounts.forEach((count, key) => {
      const [method, path, status] = key.split('_');
      lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
    });

    // Response time stats
    if (this.responseTimes.length > 0) {
      const sorted = [...this.responseTimes].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const avg = sum / sorted.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      lines.push('# HELP http_response_time_ms HTTP response time in milliseconds');
      lines.push('# TYPE http_response_time_ms summary');
      lines.push(`http_response_time_ms{quantile="0.5"} ${p50}`);
      lines.push(`http_response_time_ms{quantile="0.95"} ${p95}`);
      lines.push(`http_response_time_ms{quantile="0.99"} ${p99}`);
      lines.push(`http_response_time_ms_sum ${sum}`);
      lines.push(`http_response_time_ms_count ${sorted.length}`);
      lines.push(`http_response_time_ms_avg ${avg.toFixed(2)}`);
    }

    return lines.join('\n');
  }

  // Get metrics as JSON
  getJsonMetrics() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    const responseTimes = [...this.responseTimes];
    const responseTimeStats =
      responseTimes.length > 0
        ? {
            count: responseTimes.length,
            sum: responseTimes.reduce((a, b) => a + b, 0),
            avg:
              responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
            min: Math.min(...responseTimes),
            max: Math.max(...responseTimes),
            p50: responseTimes.sort((a, b) => a - b)[
              Math.floor(responseTimes.length * 0.5)
            ],
            p95: responseTimes.sort((a, b) => a - b)[
              Math.floor(responseTimes.length * 0.95)
            ],
            p99: responseTimes.sort((a, b) => a - b)[
              Math.floor(responseTimes.length * 0.99)
            ],
          }
        : null;

    const requestStats: Record<string, number> = {};
    this.requestCounts.forEach((count, key) => {
      requestStats[key] = count;
    });

    return {
      timestamp: new Date().toISOString(),
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      },
      http: {
        requests: requestStats,
        responseTimes: responseTimeStats,
      },
    };
  }
}
