import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  database: {
    status: string;
    type: string;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
}

interface LivenessResponse {
  status: string;
  timestamp: string;
}

interface ReadinessResponse {
  status: string;
  timestamp: string;
  checks: {
    database: boolean;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Full health check with system metrics' })
  @ApiResponse({
    status: 200,
    description: 'Health check response with detailed metrics',
  })
  async check(): Promise<HealthResponse> {
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    let dbStatus = 'unknown';
    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: this.formatUptime(uptime),
      },
      database: {
        status: dbStatus,
        type: this.dataSource.options.type,
      },
      memory: {
        heapUsed: this.formatBytes(memory.heapUsed),
        heapTotal: this.formatBytes(memory.heapTotal),
        rss: this.formatBytes(memory.rss),
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Kubernetes liveness probe endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  liveness(): LivenessResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes readiness probe endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to receive traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  async readiness(): Promise<ReadinessResponse> {
    let dbReady = false;

    try {
      await this.dataSource.query('SELECT 1');
      dbReady = true;
    } catch {
      dbReady = false;
    }

    const allChecksPass = dbReady;

    return {
      status: allChecksPass ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbReady,
      },
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'System metrics for monitoring' })
  @ApiResponse({
    status: 200,
    description: 'System metrics',
  })
  metrics() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

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
        arrayBuffers: memory.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }
}
