import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigBizService implements OnModuleInit {
  private readonly logger = new Logger(ConfigBizService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async getPointsRules() {
    return this.prisma.pointsRule.findMany({ where: { status: true }, orderBy: { bizType: 'asc' } });
  }

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { flagKey: 'asc' } });
  }

  async getVideoTemplates() {
    return [
      { templateId: 'basic_show', name: '基础展示', description: '正面 → 转身 → 背面', durations: [5, 10, 15], ratios: ['9:16', '16:9', '1:1'] },
      { templateId: 'slow_show', name: '慢速展示', description: '正面停留 → 转身 → 侧面停留', durations: [5, 10, 15], ratios: ['9:16', '16:9', '1:1'] },
      { templateId: 'quick_change', name: '快速换面', description: '快速换面切换', durations: [5, 10, 15], ratios: ['9:16', '16:9', '1:1'] },
    ];
  }

  private async seedDefaults() {
    const ruleCount = await this.prisma.pointsRule.count();
    if (ruleCount === 0) {
      this.logger.log('初始化积分消耗规则...');
      await this.prisma.pointsRule.createMany({
        data: [
          { bizType: 'photo', resultType: '白底商品图', spec: '单张标准', pointsCost: 5 },
          { bizType: 'photo', resultType: '模特上身图', spec: '单张标准', pointsCost: 8 },
          { bizType: 'photo', resultType: '场景图', spec: '单张标准', pointsCost: 10 },
          { bizType: 'photo', resultType: '海报图', spec: '单张标准', pointsCost: 12 },
          { bizType: 'photo', resultType: '高清导出', spec: '附加', pointsCost: 3 },
          { bizType: 'video', resultType: '商品展示视频', spec: '5秒', pointsCost: 30 },
          { bizType: 'video', resultType: '商品展示视频', spec: '10秒', pointsCost: 50 },
          { bizType: 'video', resultType: '模特试穿视频', spec: '5秒', pointsCost: 40 },
          { bizType: 'video', resultType: '模特试穿视频', spec: '10秒', pointsCost: 60 },
        ],
      });
    }

    const pkgCount = await this.prisma.pointsPackage.count();
    if (pkgCount === 0) {
      this.logger.log('初始化积分充值包...');
      await this.prisma.pointsPackage.createMany({
        data: [
          { packageName: '小额补充包', originalPoints: 200, giftPoints: 0, totalPoints: 200, amount: 5000 },
          { packageName: '中额补充包', originalPoints: 1000, giftPoints: 0, totalPoints: 1000, amount: 20000 },
          { packageName: '大额补充包', originalPoints: 3000, giftPoints: 0, totalPoints: 3000, amount: 50000 },
        ],
      });
    }

    const flagCount = await this.prisma.featureFlag.count();
    if (flagCount === 0) {
      this.logger.log('初始化功能开关...');
      await this.prisma.featureFlag.createMany({
        data: [
          { flagKey: 'batch_upload', flagType: 'global', enabled: false, description: '批量上传功能' },
          { flagKey: 'video_advanced', flagType: 'global', enabled: false, description: '视频高级功能' },
          { flagKey: 'clarity_detection', flagType: 'global', enabled: true, description: '清晰度检测' },
        ],
      });
    }

    const recipeCount = await this.prisma.communityRecipe.count();
    if (recipeCount === 0) {
      this.logger.log('初始化热门配方...');
      const systemUserId = 'system';
      await this.prisma.user.upsert({
        where: { openid: 'system_openid' },
        create: { userId: systemUserId, openid: 'system_openid', agreementConfirmed: true, nickname: '官方' },
        update: {},
      });
      await this.prisma.communityRecipe.createMany({
        data: [
          {
            recipeId: 'recipe_star_cover',
            userId: systemUserId,
            recipeName: '明星封面 · 黑棚大片',
            coverImageUrl: '/page-home/template-cover-01.png',
            presetSnapshot: JSON.stringify({ modelPreset: 'female_sweet', scenePreset: 'studio_dark', resultType: '模特上身图' }),
            category: '女装',
            useCount: 128,
          },
          {
            recipeId: 'recipe_korean_street',
            userId: systemUserId,
            recipeName: '韩系街拍 · 首尔秋日',
            coverImageUrl: '/page-home/template-cover-02.png',
            presetSnapshot: JSON.stringify({ modelPreset: 'female_korean', scenePreset: 'outdoor_street', resultType: '场景图' }),
            category: '女装',
            useCount: 96,
          },
          {
            recipeId: 'recipe_simple_white',
            userId: systemUserId,
            recipeName: '极简白底 · 电商主图',
            coverImageUrl: '/page-home/template-cover-01.png',
            presetSnapshot: JSON.stringify({ modelPreset: 'none', scenePreset: 'white_bg', resultType: '白底商品图' }),
            category: '通用',
            useCount: 89,
          },
          {
            recipeId: 'recipe_chinese_style',
            userId: systemUserId,
            recipeName: '新中式 · 庭院光影',
            coverImageUrl: '/page-home/template-cover-03.png',
            presetSnapshot: JSON.stringify({ modelPreset: 'female_elegant', scenePreset: 'indoor_chinese', resultType: '场景图' }),
            category: '女装',
            useCount: 72,
          },
          {
            recipeId: 'recipe_natural_outdoor',
            userId: systemUserId,
            recipeName: '自然街景 · 日系清新',
            coverImageUrl: '/page-home/template-cover-02.png',
            presetSnapshot: JSON.stringify({ modelPreset: 'female_natural', scenePreset: 'outdoor_park', resultType: '场景图' }),
            category: '女装',
            useCount: 64,
          },
          {
            recipeId: 'recipe_mens_casual',
            userId: systemUserId,
            recipeName: '男装休闲 · 都市街拍',
            coverImageUrl: '/page-home/template-cover-01.png',
            presetSnapshot: JSON.stringify({ modelPreset: 'male_casual', scenePreset: 'outdoor_urban', resultType: '模特上身图' }),
            category: '男装',
            useCount: 52,
          },
        ],
      });
    }
  }
}
