import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QueryService } from './query.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('query')
export class QueryController {
    constructor(private readonly queryService: QueryService) { }

    @Post('execute')
    execute(@Body() executeQueryDto: ExecuteQueryDto) {
        return this.queryService.executeQuery(executeQueryDto);
    }
}
