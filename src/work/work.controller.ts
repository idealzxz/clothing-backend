import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { SaveWorkDto } from './dto/save-work.dto';
import { WorkService } from './work.service';

@ApiTags('works')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('works')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @Get('list')
  @ApiOperation({ summary: '作品列表' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'resultType', required: false })
  list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('resultType') resultType?: string,
  ) {
    return this.workService.list(user.userId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      resultType,
    });
  }

  @Get(':workId')
  @ApiOperation({ summary: '作品详情' })
  getDetail(@CurrentUser() user: RequestUser, @Param('workId') workId: string) {
    return this.workService.getDetail(user.userId, workId);
  }

  @Post('save')
  @ApiOperation({ summary: '保存到作品库' })
  save(@CurrentUser() user: RequestUser, @Body() dto: SaveWorkDto) {
    return this.workService.save(user.userId, dto);
  }

  @Delete(':workId')
  @ApiOperation({ summary: '删除作品' })
  remove(@CurrentUser() user: RequestUser, @Param('workId') workId: string) {
    return this.workService.remove(user.userId, workId);
  }
}
