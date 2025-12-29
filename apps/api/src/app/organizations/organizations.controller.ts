
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';

@Controller('organizations')
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get()
    async findAll(): Promise<Organization[]> {
        return this.organizationsService.findAll();
    }

    @Get(':id')
    async findById(@Param('id') id: string): Promise<Organization | null> {
        return this.organizationsService.findById(id);
    }

    @Post()
    async create(@Body() data: Partial<Organization>): Promise<Organization> {
        return this.organizationsService.create(data);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() data: Partial<Organization>
    ): Promise<Organization | null> {
        return this.organizationsService.update(id, data);
    }

    @Put(':id/settings')
    async updateSettings(
        @Param('id') id: string,
        @Body() settings: Record<string, unknown>
    ): Promise<Organization | null> {
        return this.organizationsService.updateSettings(id, settings);
    }

    @Put(':id/activate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async activate(@Param('id') id: string): Promise<void> {
        return this.organizationsService.activate(id);
    }

    @Put(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deactivate(@Param('id') id: string): Promise<void> {
        return this.organizationsService.deactivate(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string): Promise<void> {
        return this.organizationsService.delete(id);
    }
}
