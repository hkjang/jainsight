
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface JwtUser {
    sub: string;  // userId
    username: string;
    role?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
    constructor(private readonly connectionsService: ConnectionsService) { }

    @Post()
    create(@Body() createConnectionDto: CreateConnectionDto, @Request() req: { user: JwtUser }) {
        const userId = req.user.sub;
        return this.connectionsService.create(createConnectionDto, userId);
    }

    @Post('test')
    test(@Body() createConnectionDto: CreateConnectionDto) {
        return this.connectionsService.testConnection(createConnectionDto);
    }

    @Post(':id/test')
    testById(@Param('id') id: string, @Request() req: { user: JwtUser }) {
        const userId = req.user.sub;
        return this.connectionsService.testConnectionById(id, userId);
    }

    @Get()
    findAll(@Request() req: { user: JwtUser }) {
        const userId = req.user.sub;
        const isAdmin = req.user.role === 'admin';
        return this.connectionsService.findAll(userId, isAdmin);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: { user: JwtUser }) {
        const userId = req.user.sub;
        const isAdmin = req.user.role === 'admin';
        return this.connectionsService.findOne(id, userId, isAdmin);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateConnectionDto: UpdateConnectionDto, @Request() req: { user: JwtUser }) {
        const userId = req.user.sub;
        const isAdmin = req.user.role === 'admin';
        return this.connectionsService.update(id, updateConnectionDto, userId, isAdmin);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: { user: JwtUser }) {
        const userId = req.user.sub;
        const isAdmin = req.user.role === 'admin';
        return this.connectionsService.remove(id, userId, isAdmin);
    }

    @Post(':id/share')
    share(@Param('id') id: string, @Body() body: { userIds: string[] }, @Request() req: { user: JwtUser }) {
        const userId = req.user.sub;
        return this.connectionsService.shareConnection(id, body.userIds, userId);
    }
}

