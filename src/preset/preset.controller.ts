import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateModelPresetDto, CreateScenePresetDto } from './dto/create-preset.dto';
import { PresetService } from './preset.service';

@ApiTags('presets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('presets')
export class PresetController {
  constructor(private readonly presetService: PresetService) {}

  @Get('models')
  @ApiOperation({ summary: '模特预设列表' })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'gender', required: false })
  listModels(@Query('source') source?: string, @Query('gender') gender?: string) {
    return this.presetService.listModelPresets({ source, gender });
  }

  @Get('scenes')
  @ApiOperation({ summary: '场景预设列表' })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'sceneType', required: false })
  listScenes(@Query('source') source?: string, @Query('sceneType') sceneType?: string) {
    return this.presetService.listScenePresets({ source, sceneType });
  }

  @Get('templates')
  @ApiOperation({ summary: '模板列表' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isHot', required: false })
  listTemplates(@Query('category') category?: string, @Query('isHot') isHot?: string) {
    return this.presetService.listTemplates({
      category,
      isHot: isHot === 'true' ? true : isHot === 'false' ? false : undefined,
    });
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '模板详情' })
  getTemplate(@Param('id') id: string) {
    return this.presetService.getTemplate(Number(id));
  }

  @Post('models')
  @ApiOperation({ summary: '创建自定义模特预设' })
  createModel(@CurrentUser() user: RequestUser, @Body() dto: CreateModelPresetDto) {
    return this.presetService.createModelPreset(user.userId, dto);
  }

  @Post('scenes')
  @ApiOperation({ summary: '创建自定义场景预设' })
  createScene(@CurrentUser() user: RequestUser, @Body() dto: CreateScenePresetDto) {
    return this.presetService.createScenePreset(user.userId, dto);
  }
}
