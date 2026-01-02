
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey, ApiKeyUsage } from './entities';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ApiKey, ApiKeyUsage, User])],
    controllers: [ApiKeysController],
    providers: [ApiKeysService],
    exports: [ApiKeysService],
})
export class ApiKeysModule { }
