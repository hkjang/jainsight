
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection } from './entities/connection.entity';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { DatabaseConnectorService } from '../database-connector/database-connector.service';
import * as crypto from 'crypto';

@Injectable()
export class ConnectionsService {
    // In production, this should be an environment variable
    private readonly algorithm = 'aes-256-cbc';
    // 32 bytes key for AES-256
    private readonly key = Buffer.from('12345678901234567890123456789012');
    // 16 bytes IV
    private readonly iv = Buffer.from('1234567890123456');

    constructor(
        @InjectRepository(Connection)
        private connectionsRepository: Repository<Connection>,
        private databaseConnectorService: DatabaseConnectorService,
    ) { }

    private encrypt(text: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    private decrypt(encryptedText: string): string {
        try {
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            // Needed for migration of old plain-text passwords or if key changes
            console.warn('Failed to decrypt password, returning original. Error:', error.message);
            return encryptedText;
        }
    }

    /* Exposed for internal services (Query/Schema) to get decrypted password */
    async getConnectionWithPassword(id: string): Promise<Connection | null> {
        const connection = await this.connectionsRepository.findOneBy({ id });
        if (connection && connection.password) {
            connection.password = this.decrypt(connection.password);
        }
        return connection;
    }

    async create(createConnectionDto: CreateConnectionDto) {
        const connection = this.connectionsRepository.create(createConnectionDto);
        if (connection.password) {
            connection.password = this.encrypt(connection.password);
        }
        return this.connectionsRepository.save(connection);
    }

    async findAll() {
        const connections = await this.connectionsRepository.find();
        return connections.map(conn => ({
            ...conn,
            password: '*****' // Mask password
        }));
    }

    async findOne(id: string) {
        const connection = await this.connectionsRepository.findOneBy({ id });
        if (connection) {
            connection.password = '*****'; // Mask password
        }
        return connection;
    }

    async update(id: string, updateConnectionDto: UpdateConnectionDto) {
        if (updateConnectionDto.password) {
            updateConnectionDto.password = this.encrypt(updateConnectionDto.password);
        }
        return this.connectionsRepository.update(id, updateConnectionDto);
    }

    remove(id: string) {
        return this.connectionsRepository.delete(id);
    }

    async testConnection(connectionDto: CreateConnectionDto): Promise<{ success: boolean; message: string }> {
        // If testing an existing connection (password might be masked or encrypted?)
        // Usually creation DTO has raw password from frontend
        return this.databaseConnectorService.testConnection(connectionDto);
    }
}
