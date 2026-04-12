import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { CreateJimengTaskDto } from './dto/create-jimeng-task.dto';
import { JimengProvider } from './providers/jimeng.provider';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly provider: JimengProvider,
    private readonly pointsService: PointsService,
    private readonly prisma: PrismaService,
  ) {}

  async createJimengTask(userId: string, dto: CreateJimengTaskDto) {
    const taskId = `task_${randomUUID()}`;
    const pointsCost = dto.pointsCost ?? 0;

    try {
      const createdTask = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (pointsCost > 0) {
          await this.pointsService.freeze(userId, pointsCost, taskId, tx);
        }

        return tx.generationTask.create({
          data: {
            taskId,
            userId,
            clientRequestId: dto.clientRequestId,
            taskType: dto.taskType,
            prompt: dto.prompt,
            presetId: dto.presetId,
            ratio: dto.ratio,
            count: dto.count,
            assets: dto.assets as any,
            resultUrls: [] as any,
            pointsCost,
          },
        });
      });
      void this.runTask(createdTask.taskId);
      return this.toApiTask(createdTask);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const existing = await this.prisma.generationTask.findUnique({
          where: { userId_clientRequestId: { userId, clientRequestId: dto.clientRequestId } },
        });
        if (!existing) {
          throw error;
        }
        return this.toApiTask(existing);
      }
      throw error;
    }
  }

  async getTask(userId: string, taskId: string) {
    const task = await this.prisma.generationTask.findUnique({
      where: { taskId },
    });
    if (!task || task.userId !== userId) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }
    return this.toApiTask(task);
  }

  async listTasks(userId: string, query: { cursor?: string; limit?: number; status?: string; taskType?: string }) {
    const limit = Math.min(query.limit ?? 20, 50);
    const where: Prisma.GenerationTaskWhereInput = { userId };
    if (query.status) where.status = query.status;
    if (query.taskType) where.taskType = query.taskType;

    if (query.cursor) {
      const cursorTask = await this.prisma.generationTask.findUnique({ where: { taskId: query.cursor } });
      if (cursorTask) {
        where.createdAt = { lt: cursorTask.createdAt };
      }
    }

    const tasks = await this.prisma.generationTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? items[items.length - 1].taskId : null;

    return {
      items: items.map((t) => this.toApiTask(t)),
      nextCursor,
    };
  }

  async costEstimate(query: { taskType: string; resultType?: string; count?: number }) {
    const rules = await this.prisma.pointsRule.findMany({
      where: { bizType: query.taskType, status: true },
    });
    if (!rules.length) {
      const defaultCost = query.taskType === 'video' ? 30 : 8;
      return { estimatedCost: defaultCost * (query.count ?? 1), rules: [] };
    }
    const matched = query.resultType
      ? rules.find((r) => r.resultType === query.resultType) ?? rules[0]
      : rules[0];
    return {
      estimatedCost: matched.pointsCost * (query.count ?? 1),
      rules: rules.map((r) => ({
        bizType: r.bizType,
        resultType: r.resultType,
        spec: r.spec,
        pointsCost: r.pointsCost,
      })),
    };
  }

  private async runTask(taskId: string) {
    const task = await this.prisma.generationTask.findUnique({ where: { taskId } });
    if (!task) {
      this.logger.warn(`runTask: 任务不存在 taskId=${taskId}`);
      return;
    }

    this.logger.log(`runTask 开始: taskId=${taskId}, type=${task.taskType}, assets=${JSON.stringify(task.assets)}`);

    try {
      await this.prisma.generationTask.update({
        where: { taskId },
        data: { status: 'processing' },
      });
      const taskType = task.taskType === 'video' ? 'video' : 'photo';
      const providerResult = await this.provider.submit({
        taskType,
        prompt: (task as any).prompt,
        presetId: task.presetId,
        ratio: task.ratio,
        count: task.count,
        assets: task.assets as Array<{ url: string; partType?: string }>,
      });

      this.logger.log(`runTask 即梦返回: taskId=${taskId}, providerTaskId=${providerResult.providerTaskId}, urls=${providerResult.outputUrls.length}张`);

      await this.prisma.generationTask.update({
        where: { taskId },
        data: {
          providerTaskId: providerResult.providerTaskId,
          resultUrls: providerResult.outputUrls as any,
          status: 'success',
        },
      });

      if (task.pointsCost > 0) {
        await this.pointsService.deduct(task.userId, task.pointsCost, task.taskId);
      }

      await this.createWorksFromTask(task, taskType, providerResult.outputUrls);
      this.logger.log(`runTask 完成: taskId=${taskId}`);
    } catch (error: any) {
      this.logger.error(`runTask 失败: taskId=${taskId}, error=${error?.message}`, error?.stack);
      await this.prisma.generationTask.update({
        where: { taskId },
        data: { status: 'failed', failedReason: error?.message ?? 'unknown error' },
      });
      if (task.pointsCost > 0) {
        await this.pointsService.thaw(task.userId, task.pointsCost, task.taskId);
      }
    }
  }

  private async createWorksFromTask(task: any, taskType: string, outputUrls: string[]) {
    for (let i = 0; i < outputUrls.length; i++) {
      try {
        await this.prisma.work.create({
          data: {
            workId: `work_${randomUUID()}`,
            userId: task.userId,
            taskId: task.taskId,
            resultId: `${task.taskId}_${i}`,
            resultType: taskType === 'video' ? '视频' : '图片',
            resultUrl: outputUrls[i],
            thumbnailUrl: outputUrls[i],
            generationParams: {
              presetId: task.presetId,
              ratio: task.ratio,
              count: task.count,
              pointsCost: task.pointsCost,
              allResultUrls: outputUrls,
            },
            title: task.presetId || '即梦生成',
          },
        });
      } catch (err: any) {
        this.logger.error(`创建作品失败: taskId=${task.taskId}, index=${i}, error=${err?.message}`);
      }
    }
    this.logger.log(`已创建 ${outputUrls.length} 条作品记录: taskId=${task.taskId}`);
  }

  private toApiTask(task: any) {
    return {
      taskId: task.taskId,
      userId: task.userId,
      clientRequestId: task.clientRequestId,
      taskType: task.taskType,
      prompt: task.prompt,
      presetId: task.presetId,
      ratio: task.ratio,
      count: task.count,
      assets: task.assets,
      status: task.status,
      providerTaskId: task.providerTaskId,
      resultUrls: task.resultUrls,
      pointsCost: task.pointsCost,
      failedReason: task.failedReason,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
