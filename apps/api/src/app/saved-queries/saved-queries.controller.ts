import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { SavedQueriesService } from './saved-queries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('queries')
export class SavedQueriesController {
    constructor(private readonly savedQueriesService: SavedQueriesService) { }

    @Post()
    create(@Request() req, @Body() createSavedQueryDto: any) {
        return this.savedQueriesService.create(createSavedQueryDto, req.user);
    }

    @Get()
    findAll(@Request() req) {
        return this.savedQueriesService.findAll(req.user.userId);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.savedQueriesService.remove(id, req.user.userId);
    }
}
