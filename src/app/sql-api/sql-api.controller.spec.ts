import { Test, TestingModule } from '@nestjs/testing';
import { SqlApiController } from './sql-api.controller';

describe('SqlApiController', () => {
  let controller: SqlApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SqlApiController],
    }).compile();

    controller = module.get<SqlApiController>(SqlApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
