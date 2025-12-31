'use strict';

import { Controller, Get, Put, Post, Body, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    async getSettings() {
        return this.settingsService.getSettings();
    }

    @Put()
    async updateSettings(@Body() settings: Record<string, unknown>) {
        return this.settingsService.updateSettings(settings as never);
    }

    @Post('reset')
    async resetToDefaults() {
        return this.settingsService.resetToDefaults();
    }

    @Get('history')
    async getHistory(@Query('limit') limit?: string) {
        return this.settingsService.getHistory(limit ? parseInt(limit) : 20);
    }
}
