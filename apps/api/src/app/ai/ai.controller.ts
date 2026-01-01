
import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('generate')
    async generate(@Body() body: { connectionId: string; prompt: string }) {
        return this.aiService.generateSql(body.connectionId, body.prompt);
    }

    @Post('generate-query-name')
    async generateQueryName(@Body() body: { connectionId: string; query: string }) {
        return this.aiService.generateQueryName(body.connectionId, body.query);
    }

    @Post('analyze-error')
    async analyzeError(@Body() body: { connectionId: string; query: string; errorMessage: string }) {
        return this.aiService.analyzeError(body.connectionId, body.query, body.errorMessage);
    }
}
