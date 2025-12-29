import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseConnectorService } from '../database-connector/database-connector.service';
import { TableInfo, ColumnInfo } from '../database-connector/schema.interface';
import { ConnectionsService } from '../connections/connections.service';

@Injectable()
export class SchemaService {
    constructor(
        private connectionsService: ConnectionsService,
        private databaseConnectorService: DatabaseConnectorService,
    ) { }

    async getTables(connectionId: string): Promise<TableInfo[]> {
        const connection = await this.connectionsService.getConnectionWithPassword(connectionId);
        if (!connection) {
            throw new NotFoundException(`Connection with ID ${connectionId} not found`);
        }
        return this.databaseConnectorService.getTables(connection);
    }

    async getColumns(connectionId: string, tableName: string): Promise<ColumnInfo[]> {
        const connection = await this.connectionsService.getConnectionWithPassword(connectionId);
        if (!connection) {
            throw new NotFoundException(`Connection with ID ${connectionId} not found`);
        }
        return this.databaseConnectorService.getColumns(connection, tableName);
    }
}
