
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationSettings } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
    constructor(
        @InjectRepository(Organization)
        private organizationsRepository: Repository<Organization>,
    ) { }

    async create(data: Partial<Organization>): Promise<Organization> {
        const organization = this.organizationsRepository.create(data);
        return this.organizationsRepository.save(organization);
    }

    async findAll(): Promise<Organization[]> {
        return this.organizationsRepository.find({
            order: { name: 'ASC' }
        });
    }

    async findById(id: string): Promise<Organization | null> {
        return this.organizationsRepository.findOne({ where: { id } });
    }

    async findByName(name: string): Promise<Organization | null> {
        return this.organizationsRepository.findOne({ where: { name } });
    }

    async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
        await this.organizationsRepository.update(id, data);
        return this.findById(id);
    }

    async updateSettings(id: string, settings: Partial<OrganizationSettings>): Promise<Organization | null> {
        const org = await this.findById(id);
        if (!org) return null;
        
        const updatedSettings = { ...org.settings, ...settings };
        await this.organizationsRepository.update(id, { settings: updatedSettings });
        return this.findById(id);
    }

    async deactivate(id: string): Promise<void> {
        await this.organizationsRepository.update(id, { isActive: false });
    }

    async activate(id: string): Promise<void> {
        await this.organizationsRepository.update(id, { isActive: true });
    }

    async delete(id: string): Promise<void> {
        await this.organizationsRepository.delete(id);
    }
}
