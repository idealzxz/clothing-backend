import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ConfirmAgreementDto } from './dto/confirm-agreement.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { CurrentUser } from './current-user.decorator';
import { RequestUser } from './interfaces/request-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat/login')
  @ApiOperation({ summary: '微信 code 登录' })
  login(@Body() dto: WechatLoginDto) {
    return this.authService.loginWithWechatCode(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('agreement/confirm')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '确认用户协议' })
  confirmAgreement(@CurrentUser() user: RequestUser, @Body() dto: ConfirmAgreementDto) {
    return this.authService.confirmAgreement(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '当前用户资料' })
  me(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user.userId);
  }
}
