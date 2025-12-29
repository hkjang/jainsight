
import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('generate')
    async generate(@Body() body: { connectionId: string; prompt: string }) {
        return this.aiService.generateSql(body.connectionId, body.prompt);
    }
}
