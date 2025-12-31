
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
    constructor(private readonly connectionsService: ConnectionsService) { }

    @Post()
    create(@Body() createConnectionDto: CreateConnectionDto) {
        return this.connectionsService.create(createConnectionDto);
    }

    @Post('test')
    test(@Body() createConnectionDto: CreateConnectionDto) {
        return this.connectionsService.testConnection(createConnectionDto);
    }

    @Post(':id/test')
    testById(@Param('id') id: string) {
        return this.connectionsService.testConnectionById(id);
    }

    @Get()
    findAll() {
        return this.connectionsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.connectionsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateConnectionDto: UpdateConnectionDto) {
        return this.connectionsService.update(id, updateConnectionDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.connectionsService.remove(id);
    }
}
