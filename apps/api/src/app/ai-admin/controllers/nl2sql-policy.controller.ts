import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Nl2SqlPolicyService } from '../services/nl2sql-policy.service';
import { CreateNl2SqlPolicyDto, UpdateNl2SqlPolicyDto } from '../dto/nl2sql-policy.dto';

@Controller('admin/nl2sql-policies')
export class Nl2SqlPolicyController {
    constructor(private readonly policyService: Nl2SqlPolicyService) {}

    @Get()
    async findAll() {
        return this.policyService.findAll();
    }

    @Get('active')
    async findActive() {
        return this.policyService.findActive();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.policyService.findOne(id);
    }

    @Post()
    async create(@Body() dto: CreateNl2SqlPolicyDto) {
        return this.policyService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateNl2SqlPolicyDto) {
        return this.policyService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string) {
        await this.policyService.remove(id);
    }

    @Post(':id/activate')
    async setActive(@Param('id') id: string) {
        return this.policyService.setActive(id);
    }
}
