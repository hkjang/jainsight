import { Module, Global } from '@nestjs/common';
import { DatabaseConnectorService } from './database-connector.service';

@Global()
@Module({
    providers: [DatabaseConnectorService],
    exports: [DatabaseConnectorService],
})
export class DatabaseConnectorModule { }
