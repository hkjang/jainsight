import { Controller, Post, Body, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { QueryService } from './query.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('query')
export class QueryController {
    constructor(private readonly queryService: QueryService) { }

    @Post('execute')
    async execute(@Request() req, @Body() executeQueryDto: ExecuteQueryDto) {
        try {
            // Extract user info from JWT
            const username = req.user?.username || req.user?.email || 'Unknown';
            return await this.queryService.executeQuery(executeQueryDto, username);
        } catch (error) {
            // 실제 에러 메시지를 BadRequestException으로 전달
            throw new BadRequestException(error.message || 'Query execution failed');
        }
    }
}

