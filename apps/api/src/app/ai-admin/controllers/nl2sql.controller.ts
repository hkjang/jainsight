import { Controller, Post, Body } from '@nestjs/common';
import { Nl2SqlPipelineService, Nl2SqlRequest } from '../services/nl2sql-pipeline.service';

@Controller('ai')
export class Nl2SqlController {
    constructor(private readonly pipelineService: Nl2SqlPipelineService) {}

    @Post('generate-sql')
    async generateSql(@Body() request: Nl2SqlRequest) {
        return this.pipelineService.generateSql(request);
    }
}
