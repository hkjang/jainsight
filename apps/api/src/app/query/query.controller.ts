import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { QueryService } from './query.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('query')
export class QueryController {
    constructor(private readonly queryService: QueryService) { }

    @Post('execute')
    async execute(@Body() executeQueryDto: ExecuteQueryDto) {
        try {
            return await this.queryService.executeQuery(executeQueryDto);
        } catch (error) {
            // 실제 에러 메시지를 BadRequestException으로 전달
            throw new BadRequestException(error.message || 'Query execution failed');
        }
    }
}
