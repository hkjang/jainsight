'use strict';

import { Injectable } from '@nestjs/common';

interface SystemSettings {
    general: { siteName: string; siteDescription: string; maintenanceMode: boolean; allowRegistration: boolean };
    security: { sessionTimeout: number; maxLoginAttempts: number; passwordMinLength: number; requireMFA: boolean; allowedIPs: string[] };
    query: { defaultLimit: number; maxExecutionTime: number; allowDDL: boolean; requireWhereClause: boolean; auditAllQueries: boolean };
    api: { rateLimit: number; defaultKeyExpiry: number; requireIPWhitelist: boolean };
    notifications: { emailEnabled: boolean; slackEnabled: boolean; slackWebhook: string; alertThreshold: number };
}

interface SettingsHistoryEntry {
    id: string;
    section: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
    changedBy: string;
    changedAt: Date;
}

@Injectable()
export class SettingsService {
    // In-memory storage (should be replaced with database in production)
    private settings: SystemSettings = {
        general: { siteName: 'Jainsight DB Hub', siteDescription: 'Enterprise Database Management Platform', maintenanceMode: false, allowRegistration: true },
        security: { sessionTimeout: 60, maxLoginAttempts: 5, passwordMinLength: 8, requireMFA: false, allowedIPs: [] },
        query: { defaultLimit: 1000, maxExecutionTime: 30, allowDDL: false, requireWhereClause: true, auditAllQueries: true },
        api: { rateLimit: 100, defaultKeyExpiry: 30, requireIPWhitelist: false },
        notifications: { emailEnabled: true, slackEnabled: false, slackWebhook: '', alertThreshold: 80 }
    };

    private history: SettingsHistoryEntry[] = [];
    private defaultSettings: SystemSettings = JSON.parse(JSON.stringify(this.settings));

    async getSettings(): Promise<SystemSettings> {
        return this.settings;
    }

    async updateSettings(newSettings: Partial<SystemSettings>, changedBy: string = 'system'): Promise<SystemSettings> {
        // Track changes for history
        for (const section of Object.keys(newSettings) as (keyof SystemSettings)[]) {
            const sectionSettings = newSettings[section];
            if (sectionSettings && typeof sectionSettings === 'object') {
                for (const field of Object.keys(sectionSettings)) {
                    const oldValue = (this.settings[section] as Record<string, unknown>)[field];
                    const newValue = (sectionSettings as Record<string, unknown>)[field];
                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        this.history.unshift({
                            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            section,
                            field,
                            oldValue,
                            newValue,
                            changedBy,
                            changedAt: new Date()
                        });
                    }
                }
            }
        }

        // Merge settings
        this.settings = {
            ...this.settings,
            ...newSettings,
            general: { ...this.settings.general, ...newSettings.general },
            security: { ...this.settings.security, ...newSettings.security },
            query: { ...this.settings.query, ...newSettings.query },
            api: { ...this.settings.api, ...newSettings.api },
            notifications: { ...this.settings.notifications, ...newSettings.notifications }
        };

        return this.settings;
    }

    async resetToDefaults(): Promise<SystemSettings> {
        this.history.unshift({
            id: `${Date.now()}-reset`,
            section: 'all',
            field: 'reset',
            oldValue: this.settings,
            newValue: this.defaultSettings,
            changedBy: 'system',
            changedAt: new Date()
        });
        
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        return this.settings;
    }

    async getHistory(limit: number = 20): Promise<SettingsHistoryEntry[]> {
        return this.history.slice(0, limit);
    }

    async updateSection<K extends keyof SystemSettings>(
        section: K, 
        updates: Partial<SystemSettings[K]>,
        changedBy: string = 'system'
    ): Promise<SystemSettings> {
        const sectionUpdate = { [section]: { ...this.settings[section], ...updates } } as Partial<SystemSettings>;
        return this.updateSettings(sectionUpdate, changedBy);
    }
}
