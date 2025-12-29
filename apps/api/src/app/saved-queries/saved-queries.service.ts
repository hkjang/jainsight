
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedQuery } from './entities/saved-query.entity';

@Injectable()
export class SavedQueriesService {
    constructor(
        @InjectRepository(SavedQuery)
        private savedQueriesRepository: Repository<SavedQuery>,
    ) { }

    async create(createSavedQueryDto: any, user: any): Promise<SavedQuery> {
        console.log('Creating saved query - User object:', JSON.stringify(user));
        if (!user || !user.userId) {
            throw new Error('User not authenticated or userId missing');
        }
        const query = this.savedQueriesRepository.create({
            ...createSavedQueryDto,
            userId: user.userId,
            userName: user.username,
        } as SavedQuery);
        return this.savedQueriesRepository.save(query) as Promise<SavedQuery>;
    }

    async findAll(userId: string): Promise<SavedQuery[]> {
        return this.savedQueriesRepository.find({
            where: [
                { userId: userId },
                { isPublic: true }
            ],
            order: { createdAt: 'DESC' }
        });
    }

    async remove(id: string, userId: string): Promise<void> {
        const query = await this.savedQueriesRepository.findOne({ where: { id } });
        if (query && query.userId === userId) {
            await this.savedQueriesRepository.remove(query);
        } else if (query) {
            throw new Error('Unauthorized to delete this query');
        }
    }
}

