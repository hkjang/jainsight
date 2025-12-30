import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { Nl2SqlPipelineService, Nl2SqlRequest } from '../services/nl2sql-pipeline.service';

@Controller('ai')
export class Nl2SqlController {
    constructor(private readonly pipelineService: Nl2SqlPipelineService) {}

    @Post('generate-sql')
    async generateSql(@Body() request: Nl2SqlRequest) {
        return this.pipelineService.generateSql(request);
    }

    /**
     * 연결된 DB 스키마 기반 추천 질문 생성
     */
    @Get('suggest-questions/:connectionId')
    async suggestQuestions(@Param('connectionId') connectionId: string) {
        return this.pipelineService.generateSuggestedQuestions(connectionId);
    }

    /**
     * SQL 실행 오류 AI 분석
     */
    @Post('analyze-error')
    async analyzeError(@Body() body: { connectionId: string; query: string; errorMessage: string }) {
        return this.pipelineService.analyzeQueryError(body.connectionId, body.query, body.errorMessage);
    }
}
