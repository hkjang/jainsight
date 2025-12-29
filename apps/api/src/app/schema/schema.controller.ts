import { Controller, Get, Param, Query } from '@nestjs/common';
import { SchemaService } from './schema.service';

@Controller('schema')
export class SchemaController {
    constructor(private readonly schemaService: SchemaService) { }

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
}
