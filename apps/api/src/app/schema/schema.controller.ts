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

    /**
     * 단일 테이블의 컬럼만 AI 번역
     */
    @Post(':connectionId/translations/table/:tableName')
    @UseInterceptors(new TimeoutInterceptor(300000)) // 5 minutes
    async generateTableColumnTranslations(
        @Param('connectionId') connectionId: string,
        @Param('tableName') tableName: string,
    ) {
        try {
            const result = await this.tableTranslationService.translateSingleTable(connectionId, tableName);
            return {
                success: true,
                message: `${tableName} 테이블 컬럼 번역 완료`,
                ...result,
            };
        } catch (error) {
            // AI 실패 시에도 사전 번역 결과 반환
            const fallbackResult = await this.tableTranslationService.translateSingleTableWithDictionary(connectionId, tableName);
            return {
                success: true,
                message: `${tableName} 사전 번역 완료 (AI 사용 불가)`,
                usedDictionary: true,
                ...fallbackResult,
            };
        }
    }

    /**
     * 컬럼 번역 수동 업데이트
     */
    @Patch(':connectionId/translations/:tableName/column/:columnName')
    async updateColumnTranslation(
        @Param('connectionId') connectionId: string,
        @Param('tableName') tableName: string,
        @Param('columnName') columnName: string,
        @Body() body: { koreanName: string },
    ) {
        const result = await this.tableTranslationService.updateColumnTranslation(
            connectionId, 
            tableName, 
            columnName,
            body.koreanName,
        );
        return {
            success: true,
            message: `${columnName} 컬럼 번역이 '${body.koreanName}'으로 저장되었습니다`,
            ...result,
        };
    }
}
