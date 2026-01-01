
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Connection, ConnectionVisibility } from './entities/connection.entity';
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

    /* Check if user can access this connection */
    private canAccess(connection: Connection, userId: string, isAdmin: boolean = false): boolean {
        if (isAdmin) return true;
        if (connection.visibility === ConnectionVisibility.PUBLIC) return true;
        if (connection.createdBy === userId) return true;
        if (connection.visibility === ConnectionVisibility.TEAM && 
            connection.sharedWith?.includes(userId)) return true;
        return false;
    }

    /* Exposed for internal services (Query/Schema) to get decrypted password */
    async getConnectionWithPassword(id: string, userId?: string): Promise<Connection | null> {
        const connection = await this.connectionsRepository.findOneBy({ id });
        if (!connection) return null;
        
        // If userId provided, check access (internal calls may not have userId)
        if (userId && !this.canAccess(connection, userId)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        
        if (connection.password) {
            connection.password = this.decrypt(connection.password);
        }
        return connection;
    }

    async create(createConnectionDto: CreateConnectionDto, userId: string) {
        const visibility = (createConnectionDto.visibility as ConnectionVisibility) || ConnectionVisibility.PRIVATE;
        const connection = this.connectionsRepository.create({
            ...createConnectionDto,
            createdBy: userId,
            visibility,
            sharedWith: createConnectionDto.sharedWith || [],
        });
        if (connection.password) {
            connection.password = this.encrypt(connection.password);
        }
        return this.connectionsRepository.save(connection);
    }

    async findAll(userId: string, isAdmin: boolean = false) {
        let connections: Connection[];
        
        if (isAdmin) {
            // Admin sees all
            connections = await this.connectionsRepository.find();
        } else {
            // Regular user: public + own + shared with them
            connections = await this.connectionsRepository
                .createQueryBuilder('conn')
                .where(new Brackets(qb => {
                    qb.where('conn.visibility = :public', { public: ConnectionVisibility.PUBLIC })
                      .orWhere('conn.createdBy = :userId', { userId })
                      .orWhere('conn.sharedWith LIKE :userIdPattern', { userIdPattern: `%${userId}%` });
                }))
                .getMany();
        }
        
        return connections.map(conn => ({
            ...conn,
            password: '*****', // Mask password
            isOwner: conn.createdBy === userId,
        }));
    }

    async findOne(id: string, userId: string, isAdmin: boolean = false) {
        const connection = await this.connectionsRepository.findOneBy({ id });
        if (!connection) {
            throw new NotFoundException('Connection not found');
        }
        if (!this.canAccess(connection, userId, isAdmin)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        return {
            ...connection,
            password: '*****',
            isOwner: connection.createdBy === userId,
        };
    }

    async update(id: string, updateConnectionDto: UpdateConnectionDto, userId: string, isAdmin: boolean = false) {
        const connection = await this.connectionsRepository.findOneBy({ id });
        if (!connection) {
            throw new NotFoundException('Connection not found');
        }
        // Only owner or admin can update
        if (connection.createdBy !== userId && !isAdmin) {
            throw new ForbiddenException('Only the owner can update this connection');
        }
        if (updateConnectionDto.password) {
            updateConnectionDto.password = this.encrypt(updateConnectionDto.password);
        }
        // Build update object with proper types - exclude visibility, then add it back with proper type
        const { visibility, ...rest } = updateConnectionDto;
        const updateData: Partial<Connection> = rest;
        if (visibility) {
            updateData.visibility = visibility as ConnectionVisibility;
        }
        return this.connectionsRepository.update(id, updateData);
    }

    async remove(id: string, userId: string, isAdmin: boolean = false) {
        const connection = await this.connectionsRepository.findOneBy({ id });
        if (!connection) {
            throw new NotFoundException('Connection not found');
        }
        // Only owner or admin can delete
        if (connection.createdBy !== userId && !isAdmin) {
            throw new ForbiddenException('Only the owner can delete this connection');
        }
        return this.connectionsRepository.delete(id);
    }

    async testConnection(connectionDto: CreateConnectionDto): Promise<{ success: boolean; message: string }> {
        // If testing an existing connection (password might be masked or encrypted?)
        // Usually creation DTO has raw password from frontend
        return this.databaseConnectorService.testConnection(connectionDto);
    }

    async testConnectionById(id: string, userId: string): Promise<{ success: boolean; message: string }> {
        const connection = await this.getConnectionWithPassword(id, userId);
        if (!connection) {
            return { success: false, message: 'Connection not found' };
        }
        
        // Convert the connection entity to the format expected by testConnection
        const connectionDto: CreateConnectionDto = {
            name: connection.name,
            type: connection.type,
            host: connection.host,
            port: connection.port,
            database: connection.database,
            username: connection.username,
            password: connection.password, // Already decrypted by getConnectionWithPassword
        };
        
        return this.databaseConnectorService.testConnection(connectionDto);
    }

    async shareConnection(id: string, userIds: string[], userId: string): Promise<void> {
        const connection = await this.connectionsRepository.findOneBy({ id });
        if (!connection) {
            throw new NotFoundException('Connection not found');
        }
        if (connection.createdBy !== userId) {
            throw new ForbiddenException('Only the owner can share this connection');
        }
        await this.connectionsRepository.update(id, { 
            visibility: ConnectionVisibility.TEAM, 
            sharedWith: userIds 
        });
    }
}

