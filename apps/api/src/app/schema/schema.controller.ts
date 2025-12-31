import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { SchemaService } from './schema.service';
import { TableTranslationService } from './table-translation.service';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';

// ===== DTO 정의 =====
interface TranslationOptionsDto {
    forceRetranslate?: boolean;
    useAi?: boolean;
    batchSize?: number;
    maxConcurrency?: number;
}

interface UpdateColumnTranslationDto {
    koreanName: string;
}

interface UpdateMultipleColumnsDto {
    translations: Record<string, string>;
}

interface ImportTranslationsDto {
    translations: { 
        tableName: string; 
        koreanName: string; 
        columnTranslations?: Record<string, string>; 
    }[];
}

@Controller('schema')
export class SchemaController {
    constructor(
        private readonly schemaService: SchemaService,
        private readonly tableTranslationService: TableTranslationService,
    ) { }

    // ===== 기존 Schema 엔드포인트 =====

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

    // ===== 번역 서비스 상태 =====

    /**
     * 번역 서비스 상태 조회
     */
    @Get('translations/status')
    getTranslationServiceStatus() {
        return {
            success: true,
            ...this.tableTranslationService.getStatus(),
        };
    }

    /**
     * AI 클라이언트 재초기화
     */
    @Post('translations/reinitialize-ai')
    async reinitializeAiClient() {
        const result = await this.tableTranslationService.reinitializeAiClient();
        return {
            success: result,
            message: result ? 'AI 클라이언트가 재초기화되었습니다' : 'AI 클라이언트 초기화 실패',
        };
    }

    // ===== 테이블 번역 CRUD =====

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
    async generateTranslations(
        @Param('connectionId') connectionId: string,
        @Body() options?: TranslationOptionsDto,
    ) {
        const result = await this.tableTranslationService.translateAndSave(connectionId, options);
        return {
            success: true,
            message: `${result.translated}개 테이블 번역 완료, ${result.skipped}개 스킵, ${result.failed}개 실패 (${result.duration}ms)`,
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
        @Body() options?: TranslationOptionsDto,
    ) {
        try {
            const result = await this.tableTranslationService.translateSingleTable(connectionId, tableName, options);
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
     * 모든 테이블의 컬럼을 AI로 번역
     * 타임아웃 10분 (많은 테이블에 대해 AI 번역에 시간이 걸릴 수 있음)
     */
    @Post(':connectionId/translations/all-columns')
    @UseInterceptors(new TimeoutInterceptor(600000)) // 10 minutes
    async generateAllTablesColumnTranslations(
        @Param('connectionId') connectionId: string,
        @Body() options?: TranslationOptionsDto,
    ) {
        const result = await this.tableTranslationService.translateAllTablesColumns(connectionId, options);
        return {
            success: true,
            message: `${result.translatedTables}/${result.totalTables}개 테이블의 ${result.totalColumns}개 컬럼 번역 완료 (${result.duration}ms)`,
            ...result,
        };
    }

    // ===== 컬럼 번역 =====

    /**
     * 컬럼 번역 수동 업데이트
     */
    @Patch(':connectionId/translations/:tableName/column/:columnName')
    async updateColumnTranslation(
        @Param('connectionId') connectionId: string,
        @Param('tableName') tableName: string,
        @Param('columnName') columnName: string,
        @Body() body: UpdateColumnTranslationDto,
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

    /**
     * 여러 컬럼 번역 일괄 업데이트
     */
    @Patch(':connectionId/translations/:tableName/columns')
    async updateMultipleColumnTranslations(
        @Param('connectionId') connectionId: string,
        @Param('tableName') tableName: string,
        @Body() body: UpdateMultipleColumnsDto,
    ) {
        const result = await this.tableTranslationService.updateMultipleColumnTranslations(
            connectionId, 
            tableName, 
            body.translations,
        );
        return {
            success: true,
            message: `${result.updatedColumns}개 컬럼 번역이 저장되었습니다`,
            ...result,
        };
    }

    // ===== 번역 삭제 =====

    /**
     * 단일 테이블 번역 삭제
     */
    @Delete(':connectionId/translations/:tableName')
    @HttpCode(HttpStatus.OK)
    async deleteTranslation(
        @Param('connectionId') connectionId: string,
        @Param('tableName') tableName: string,
    ) {
        const deleted = await this.tableTranslationService.deleteTranslation(connectionId, tableName);
        return {
            success: deleted,
            message: deleted 
                ? `${tableName} 번역이 삭제되었습니다` 
                : `${tableName} 번역을 찾을 수 없습니다`,
        };
    }

    /**
     * 연결의 모든 번역 삭제
     */
    @Delete(':connectionId/translations')
    @HttpCode(HttpStatus.OK)
    async deleteAllTranslations(@Param('connectionId') connectionId: string) {
        const count = await this.tableTranslationService.deleteAllTranslations(connectionId);
        return {
            success: true,
            message: `${count}개 번역이 삭제되었습니다`,
            deletedCount: count,
        };
    }

    // ===== 내보내기/가져오기 =====

    /**
     * 번역 내보내기 (JSON)
     */
    @Get(':connectionId/translations/export')
    async exportTranslations(@Param('connectionId') connectionId: string) {
        return this.tableTranslationService.exportTranslations(connectionId);
    }

    /**
     * 번역 가져오기 (JSON)
     */
    @Post(':connectionId/translations/import')
    async importTranslations(
        @Param('connectionId') connectionId: string,
        @Body() body: ImportTranslationsDto,
    ) {
        const result = await this.tableTranslationService.importTranslations(connectionId, body.translations);
        return {
            success: true,
            message: `${result.imported}개 새로 추가, ${result.updated}개 업데이트됨`,
            ...result,
        };
    }

    // ===== 캐시 관리 =====

    /**
     * 캐시 무효화
     */
    @Post(':connectionId/translations/invalidate-cache')
    invalidateCache(@Param('connectionId') connectionId: string) {
        this.tableTranslationService.invalidateCache(connectionId);
        return {
            success: true,
            message: '캐시가 무효화되었습니다',
        };
    }

    /**
     * 모든 캐시 무효화
     */
    @Post('translations/invalidate-all-cache')
    invalidateAllCache() {
        this.tableTranslationService.invalidateCache();
        return {
            success: true,
            message: '모든 캐시가 무효화되었습니다',
        };
    }
}
