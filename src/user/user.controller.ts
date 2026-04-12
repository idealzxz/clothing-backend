import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('settings')
  @ApiOperation({ summary: '获取用户设置' })
  getSettings(@CurrentUser() user: RequestUser) {
    return this.userService.getSettings(user.userId);
  }

  @Put('settings')
  @ApiOperation({ summary: '更新用户设置' })
  updateSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateSettingsDto) {
    return this.userService.updateSettings(user.userId, dto);
  }
}
