import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SaveWorkDto } from './dto/save-work.dto';

@Injectable()
export class WorkService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: { cursor?: string; limit?: number; resultType?: string }) {
    const limit = Math.min(query.limit ?? 20, 50);
    const where: Prisma.WorkWhereInput = { userId };
    if (query.resultType) where.resultType = query.resultType;

    if (query.cursor) {
      const cursorWork = await this.prisma.work.findUnique({ where: { workId: query.cursor } });
      if (cursorWork) {
        where.createdAt = { lt: cursorWork.createdAt };
      }
    }

    const works = await this.prisma.work.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = works.length > limit;
    const items = hasMore ? works.slice(0, limit) : works;
    return {
      items: items.map((w) => this.toApi(w)),
      nextCursor: hasMore ? items[items.length - 1].workId : null,
    };
  }

  async getDetail(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { workId } });
    if (!work || work.userId !== userId) {
      throw new NotFoundException('作品不存在');
    }
    return this.toApi(work);
  }

  async save(userId: string, dto: SaveWorkDto) {
    const work = await this.prisma.work.create({
      data: {
        workId: `work_${randomUUID()}`,
        userId,
        taskId: dto.taskId,
        resultId: dto.resultId,
        resultType: dto.resultType,
        resultUrl: dto.resultUrl,
        thumbnailUrl: dto.thumbnailUrl,
        generationParams: dto.generationParams as any,
        title: dto.title,
      },
    });
    return this.toApi(work);
  }

  async remove(userId: string, workId: string) {
    const work = await this.prisma.work.findUnique({ where: { workId } });
    if (!work || work.userId !== userId) {
      throw new NotFoundException('作品不存在');
    }
    await this.prisma.work.delete({ where: { workId } });
    return { success: true };
  }

  private toApi(work: any) {
    return {
      workId: work.workId,
      userId: work.userId,
      taskId: work.taskId,
      resultId: work.resultId,
      resultType: work.resultType,
      resultUrl: work.resultUrl,
      thumbnailUrl: work.thumbnailUrl,
      generationParams: work.generationParams,
      title: work.title,
      createdAt: work.createdAt,
    };
  }
}
