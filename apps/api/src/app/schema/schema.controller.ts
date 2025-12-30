import { Controller, Get, Post, Patch, Param, Body, UseInterceptors } from '@nestjs/common';
import { SchemaService } from './schema.service';
import { TableTranslationService } from './table-translation.service';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';

@Controller('schema')
export class SchemaController {
    constructor(
        private readonly schemaService: SchemaService,
        private readonly tableTranslationService: TableTranslationService,
    ) { }

    @Get(':connectionId/tables')
    getTables(@Param('connectionId') connectionId: string) {
        return this.schemaService.getTables(connectionId);
    }

    @Get(':connectionId/tables/:tableName/columns')
    getColumns(
        @Param('connectionId') connectionId: string,
        @Param('tableName') tableName: string,
    ) {
        return this.schemaService.getColumns(connectionId, tableName);
    }

    /**
     * 테이블 번역 조회
     */
    @Get(':connectionId/translations')
    getTranslations(@Param('connectionId') connectionId: string) {
        return this.tableTranslationService.getTranslations(connectionId);
    }

    /**
     * AI로 테이블 번역 생성 및 저장
     * 타임아웃 5분 (AI 번역에 시간이 걸릴 수 있음)
     */
    @Post(':connectionId/translations/generate')
    @UseInterceptors(new TimeoutInterceptor(300000)) // 5 minutes
    async generateTranslations(@Param('connectionId') connectionId: string) {
        const result = await this.tableTranslationService.translateAndSave(connectionId);
        return {
            success: true,
            message: `${result.translated}개 테이블 번역 완료, ${result.skipped}개 스킵`,
            ...result,
        };
    }

    /**
     * 수동 번역 업데이트
     */
    @Patch(':connectionId/translations/:tableName')
    updateTranslation(
        @Param('connectionId') connectionId: string,
        @Param('tableName') tableName: string,
        @Body() body: { koreanName: string; koreanDescription?: string },
    ) {
        return this.tableTranslationService.updateTranslation(
            connectionId, 
            tableName, 
            body.koreanName,
            body.koreanDescription,
        );
    }
}
