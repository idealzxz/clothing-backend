import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecipeService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== 社区 ==========

  async communityList(query: { category?: string; cursor?: string; limit?: number }) {
    const limit = Math.min(query.limit ?? 20, 50);
    const where: Prisma.CommunityRecipeWhereInput = { status: 'published' };
    if (query.category) where.category = query.category;

    if (query.cursor) {
      const cursorItem = await this.prisma.communityRecipe.findUnique({ where: { recipeId: query.cursor } });
      if (cursorItem) where.createdAt = { lt: cursorItem.createdAt };
    }

    const recipes = await this.prisma.communityRecipe.findMany({
      where,
      orderBy: [{ useCount: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
    });

    const hasMore = recipes.length > limit;
    const items = hasMore ? recipes.slice(0, limit) : recipes;
    return {
      items: items.map((r) => ({
        recipeId: r.recipeId,
        recipeName: r.recipeName,
        coverImageUrl: r.coverImageUrl,
        category: r.category,
        useCount: r.useCount,
        userId: r.userId,
        createdAt: r.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].recipeId : null,
    };
  }

  async communityDetail(recipeId: string) {
    const recipe = await this.prisma.communityRecipe.findUnique({ where: { recipeId } });
    if (!recipe || recipe.status !== 'published') throw new NotFoundException('配方不存在');
    return {
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      coverImageUrl: recipe.coverImageUrl,
      category: recipe.category,
      useCount: recipe.useCount,
      userId: recipe.userId,
      createdAt: recipe.createdAt,
    };
  }

  async publish(userId: string, data: { recipeName: string; coverImageUrl: string; presetSnapshot: any; category?: string }) {
    if (!data.recipeName || data.recipeName.length > 20) {
      throw new BadRequestException('配方名称不能为空且不超过20字');
    }
    return this.prisma.communityRecipe.create({
      data: {
        recipeId: `recipe_${randomUUID()}`,
        userId,
        recipeName: data.recipeName,
        coverImageUrl: data.coverImageUrl,
        presetSnapshot: data.presetSnapshot,
        category: data.category ?? '通用',
      },
    });
  }

  async offline(userId: string, recipeId: string) {
    const recipe = await this.prisma.communityRecipe.findUnique({ where: { recipeId } });
    if (!recipe || recipe.userId !== userId) throw new NotFoundException('配方不存在');
    await this.prisma.communityRecipe.update({ where: { recipeId }, data: { status: 'offline' } });
    return { success: true };
  }

  // ========== 我的配方 ==========

  async myList(userId: string) {
    return this.prisma.userRecipeCollection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myDetail(userId: string, collectionId: string) {
    const item = await this.prisma.userRecipeCollection.findUnique({ where: { collectionId } });
    if (!item || item.userId !== userId) throw new NotFoundException('配方不存在');

    let presetSnapshot = item.customPresetSnapshot;
    if (!presetSnapshot && item.recipeId) {
      const community = await this.prisma.communityRecipe.findUnique({ where: { recipeId: item.recipeId } });
      presetSnapshot = community?.presetSnapshot ?? null;
    }

    return { ...item, presetSnapshot };
  }

  async collect(userId: string, recipeId: string) {
    const recipe = await this.prisma.communityRecipe.findUnique({ where: { recipeId } });
    if (!recipe || recipe.status !== 'published') throw new NotFoundException('配方不存在');

    return this.prisma.userRecipeCollection.create({
      data: {
        collectionId: `coll_${randomUUID()}`,
        userId,
        recipeId,
        sourceType: 'community',
        recipeName: recipe.recipeName,
      },
    });
  }

  async uncollect(userId: string, collectionId: string) {
    const item = await this.prisma.userRecipeCollection.findUnique({ where: { collectionId } });
    if (!item || item.userId !== userId) throw new NotFoundException('配方不存在');
    await this.prisma.userRecipeCollection.delete({ where: { collectionId } });
    return { success: true };
  }

  async save(userId: string, data: { recipeName: string; customPresetSnapshot: any; collectionId?: string }) {
    if (data.collectionId) {
      const existing = await this.prisma.userRecipeCollection.findUnique({ where: { collectionId: data.collectionId } });
      if (!existing || existing.userId !== userId) throw new NotFoundException('配方不存在');
      return this.prisma.userRecipeCollection.update({
        where: { collectionId: data.collectionId },
        data: { recipeName: data.recipeName, customPresetSnapshot: data.customPresetSnapshot },
      });
    }

    return this.prisma.userRecipeCollection.create({
      data: {
        collectionId: `coll_${randomUUID()}`,
        userId,
        sourceType: 'self_created',
        recipeName: data.recipeName,
        customPresetSnapshot: data.customPresetSnapshot,
      },
    });
  }

  async deleteMyRecipe(userId: string, collectionId: string) {
    const item = await this.prisma.userRecipeCollection.findUnique({ where: { collectionId } });
    if (!item || item.userId !== userId) throw new NotFoundException('配方不存在');
    await this.prisma.userRecipeCollection.delete({ where: { collectionId } });
    return { success: true };
  }

  async use(recipeId: string) {
    const recipe = await this.prisma.communityRecipe.findUnique({ where: { recipeId } });
    if (!recipe || recipe.status !== 'published') throw new NotFoundException('配方不存在');
    await this.prisma.communityRecipe.update({
      where: { recipeId },
      data: { useCount: { increment: 1 } },
    });
    return {
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      presetSnapshot: recipe.presetSnapshot,
    };
  }
}
