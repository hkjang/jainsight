import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecuritySettings } from '../entities/security-settings.entity';

export interface UpdateSecuritySettingsDto {
    enablePromptInjectionCheck?: boolean;
    enableSqlInjectionCheck?: boolean;
    enableDdlBlock?: boolean;
    enableDmlBlock?: boolean;
    enablePiiMasking?: boolean;
    maxResultRows?: number;
    blockedKeywords?: string;
    piiColumns?: string;
    enableRateLimiting?: boolean;
    maxRequestsPerMinute?: number;
    enableAuditLog?: boolean;
    retentionDays?: number;
}

@Injectable()
export class SecuritySettingsService {
    constructor(
        @InjectRepository(SecuritySettings)
        private readonly settingsRepo: Repository<SecuritySettings>,
    ) {}

    async getSettings(organizationId = 'default'): Promise<SecuritySettings> {
        let settings = await this.settingsRepo.findOne({ where: { organizationId } });
        
        if (!settings) {
            // Create default settings
            settings = this.settingsRepo.create({
                organizationId,
                enablePromptInjectionCheck: true,
                enableSqlInjectionCheck: true,
                enableDdlBlock: true,
                enableDmlBlock: false,
                enablePiiMasking: true,
                maxResultRows: 1000,
                blockedKeywords: 'DROP, DELETE, TRUNCATE, ALTER, CREATE, GRANT, REVOKE',
                piiColumns: 'ssn, password, credit_card, phone, email, address',
                enableRateLimiting: true,
                maxRequestsPerMinute: 60,
                enableAuditLog: true,
                retentionDays: 90,
            });
            settings = await this.settingsRepo.save(settings);
        }
        
        return settings;
    }

    async updateSettings(dto: UpdateSecuritySettingsDto, organizationId = 'default'): Promise<SecuritySettings> {
        const settings = await this.getSettings(organizationId);
        
        Object.assign(settings, dto);
        
        return this.settingsRepo.save(settings);
    }

    async resetToDefaults(organizationId = 'default'): Promise<SecuritySettings> {
        const settings = await this.getSettings(organizationId);
        
        settings.enablePromptInjectionCheck = true;
        settings.enableSqlInjectionCheck = true;
        settings.enableDdlBlock = true;
        settings.enableDmlBlock = false;
        settings.enablePiiMasking = true;
        settings.maxResultRows = 1000;
        settings.blockedKeywords = 'DROP, DELETE, TRUNCATE, ALTER, CREATE, GRANT, REVOKE';
        settings.piiColumns = 'ssn, password, credit_card, phone, email, address';
        settings.enableRateLimiting = true;
        settings.maxRequestsPerMinute = 60;
        settings.enableAuditLog = true;
        settings.retentionDays = 90;
        
        return this.settingsRepo.save(settings);
    }
}
