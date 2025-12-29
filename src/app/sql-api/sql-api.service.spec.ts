import { Test, TestingModule } from '@nestjs/testing';
import { SqlApiService } from './sql-api.service';

describe('SqlApiService', () => {
  let service: SqlApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SqlApiService],
    }).compile();

    service = module.get<SqlApiService>(SqlApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
