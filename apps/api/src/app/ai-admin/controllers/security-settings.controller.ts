import { Controller, Get, Put, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SecuritySettingsService, UpdateSecuritySettingsDto } from '../services/security-settings.service';

@Controller('admin/security-settings')
export class SecuritySettingsController {
    constructor(private readonly settingsService: SecuritySettingsService) {}

    @Get()
    async getSettings() {
        return this.settingsService.getSettings();
    }

    @Put()
    async updateSettings(@Body() dto: UpdateSecuritySettingsDto) {
        return this.settingsService.updateSettings(dto);
    }

    @Post('reset')
    @HttpCode(HttpStatus.OK)
    async resetToDefaults() {
        return this.settingsService.resetToDefaults();
    }
}
