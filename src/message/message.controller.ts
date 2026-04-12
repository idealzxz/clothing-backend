import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { MessageService } from './message.service';

@ApiTags('messages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('list')
  @ApiOperation({ summary: '站内消息列表' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messageService.list(user.userId, { cursor, limit: limit ? Number(limit) : undefined });
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读消息数量' })
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.messageService.unreadCount(user.userId);
  }

  @Post(':messageId/read')
  @ApiOperation({ summary: '标记消息已读' })
  markRead(@CurrentUser() user: RequestUser, @Param('messageId') messageId: string) {
    return this.messageService.markRead(user.userId, messageId);
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.messageService.markAllRead(user.userId);
  }
}
