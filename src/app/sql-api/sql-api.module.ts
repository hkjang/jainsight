import { Module } from '@nestjs/common';
import { SqlApiService } from './sql-api.service';
import { SqlApiController } from './sql-api.controller';
import { SqlApiController } from './sql-api.controller';
import { SqlApiService } from './sql-api.service';

@Module({
  providers: [SqlApiService],
  controllers: [SqlApiController]
})
export class SqlApiModule {}
