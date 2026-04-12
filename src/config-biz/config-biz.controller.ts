import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ConfigBizService } from './config-biz.service';

@ApiTags('config')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('config')
export class ConfigBizController {
  constructor(private readonly configBizService: ConfigBizService) {}

  @Get('points-rules')
  @ApiOperation({ summary: '获取积分消耗规则' })
  getPointsRules() {
    return this.configBizService.getPointsRules();
  }

  @Get('feature-flags')
  @ApiOperation({ summary: '获取功能开关' })
  getFeatureFlags() {
    return this.configBizService.getFeatureFlags();
  }

  @Get('video-templates')
  @ApiOperation({ summary: '获取视频剧本模板列表' })
  getVideoTemplates() {
    return this.configBizService.getVideoTemplates();
  }
}
