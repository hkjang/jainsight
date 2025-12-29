import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nl2SqlPolicy } from '../entities/nl2sql-policy.entity';
import { CreateNl2SqlPolicyDto, UpdateNl2SqlPolicyDto } from '../dto/nl2sql-policy.dto';

@Injectable()
export class Nl2SqlPolicyService {
    constructor(
        @InjectRepository(Nl2SqlPolicy)
        private readonly policyRepo: Repository<Nl2SqlPolicy>,
    ) {}

    async findAll(): Promise<Nl2SqlPolicy[]> {
        return this.policyRepo.find({
            order: { priority: 'ASC', createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Nl2SqlPolicy> {
        const policy = await this.policyRepo.findOne({ where: { id } });
        if (!policy) {
            throw new NotFoundException(`NL2SQL Policy with id ${id} not found`);
        }
        return policy;
    }

    async findActive(): Promise<Nl2SqlPolicy | null> {
        const policies = await this.policyRepo.find({
            where: { isActive: true },
            order: { priority: 'ASC' },
        });
        return policies.length > 0 ? policies[0] : null;
    }

    async create(dto: CreateNl2SqlPolicyDto): Promise<Nl2SqlPolicy> {
        const policy = this.policyRepo.create({
            ...dto,
            blockedKeywords: dto.blockedKeywords ? JSON.stringify(dto.blockedKeywords) : null,
            allowedTables: dto.allowedTables ? JSON.stringify(dto.allowedTables) : null,
            deniedColumns: dto.deniedColumns ? JSON.stringify(dto.deniedColumns) : null,
        });
        return this.policyRepo.save(policy);
    }

    async update(id: string, dto: UpdateNl2SqlPolicyDto): Promise<Nl2SqlPolicy> {
        const policy = await this.findOne(id);
        
        if (dto.blockedKeywords !== undefined) {
            policy.blockedKeywords = JSON.stringify(dto.blockedKeywords);
        }
        if (dto.allowedTables !== undefined) {
            policy.allowedTables = JSON.stringify(dto.allowedTables);
        }
        if (dto.deniedColumns !== undefined) {
            policy.deniedColumns = JSON.stringify(dto.deniedColumns);
        }

        const { blockedKeywords, allowedTables, deniedColumns, ...rest } = dto;
        Object.assign(policy, rest);

        return this.policyRepo.save(policy);
    }

    async remove(id: string): Promise<void> {
        const policy = await this.findOne(id);
        await this.policyRepo.remove(policy);
    }

    async setActive(id: string): Promise<Nl2SqlPolicy> {
        // Deactivate all policies first
        await this.policyRepo.update({}, { isActive: false });
        
        // Activate the selected one
        const policy = await this.findOne(id);
        policy.isActive = true;
        return this.policyRepo.save(policy);
    }
}
