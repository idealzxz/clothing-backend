import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { PublishRecipeDto, SaveMyRecipeDto } from './dto/recipe.dto';
import { RecipeService } from './recipe.service';

@ApiTags('recipe')
@Controller('recipe')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  // ========== 社区（浏览类接口无需登录） ==========

  @Get('community/list')
  @ApiOperation({ summary: '社区配方列表（无需登录）' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  communityList(
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recipeService.communityList({ category, cursor, limit: limit ? Number(limit) : undefined });
  }

  @Get('community/detail')
  @ApiOperation({ summary: '配方介绍（不含参数，无需登录）' })
  @ApiQuery({ name: 'recipeId', required: true })
  communityDetail(@Query('recipeId') recipeId: string) {
    return this.recipeService.communityDetail(recipeId);
  }

  // ========== 社区（写操作需登录） ==========

  @Post('community/publish')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '发布配方到社区' })
  publish(@CurrentUser() user: RequestUser, @Body() dto: PublishRecipeDto) {
    return this.recipeService.publish(user.userId, dto);
  }

  @Post('community/offline')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '下架配方' })
  offline(@CurrentUser() user: RequestUser, @Body('recipeId') recipeId: string) {
    return this.recipeService.offline(user.userId, recipeId);
  }

  // ========== 我的配方（全部需登录） ==========

  @Get('my/list')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '我的配方列表' })
  myList(@CurrentUser() user: RequestUser) {
    return this.recipeService.myList(user.userId);
  }

  @Get('my/detail')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '我的配方详情（含完整参数）' })
  @ApiQuery({ name: 'collectionId', required: true })
  myDetail(@CurrentUser() user: RequestUser, @Query('collectionId') collectionId: string) {
    return this.recipeService.myDetail(user.userId, collectionId);
  }

  @Post('my/collect')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '收藏社区配方' })
  collect(@CurrentUser() user: RequestUser, @Body('recipeId') recipeId: string) {
    return this.recipeService.collect(user.userId, recipeId);
  }

  @Post('my/uncollect')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '取消收藏' })
  uncollect(@CurrentUser() user: RequestUser, @Body('collectionId') collectionId: string) {
    return this.recipeService.uncollect(user.userId, collectionId);
  }

  @Post('my/save')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建/更新自建配方' })
  save(@CurrentUser() user: RequestUser, @Body() dto: SaveMyRecipeDto) {
    return this.recipeService.save(user.userId, dto);
  }

  @Post('my/delete')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除我的配方' })
  deleteRecipe(@CurrentUser() user: RequestUser, @Body('collectionId') collectionId: string) {
    return this.recipeService.deleteMyRecipe(user.userId, collectionId);
  }

  // ========== 使用 ==========

  @Post('use')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '使用配方（use_count++，返回参数）' })
  use(@Body('recipeId') recipeId: string) {
    return this.recipeService.use(recipeId);
  }
}
