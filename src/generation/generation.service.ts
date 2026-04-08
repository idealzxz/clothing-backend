import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { CreateJimengTaskDto } from './dto/create-jimeng-task.dto';
import { JimengProvider } from './providers/jimeng.provider';

@Injectable()
export class GenerationService {
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

  private async runTask(taskId: string) {
    const task = await this.prisma.generationTask.findUnique({ where: { taskId } });
    if (!task) {
      return;
    }

    try {
      await this.prisma.generationTask.update({
        where: { taskId },
        data: { status: 'processing' },
      });
      const taskType = task.taskType === 'video' ? 'video' : 'photo';
      const providerResult = await this.provider.submit({
        taskType,
        presetId: task.presetId,
        ratio: task.ratio,
        count: task.count,
        assets: task.assets as Array<{ url: string; partType?: string }>,
      });
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
    } catch (_error) {
      await this.prisma.generationTask.update({
        where: { taskId },
        data: { status: 'failed' },
      });
      if (task.pointsCost > 0) {
        await this.pointsService.thaw(task.userId, task.pointsCost, task.taskId);
      }
    }
  }

  private toApiTask(task: any) {
    return {
      taskId: task.taskId,
      userId: task.userId,
      clientRequestId: task.clientRequestId,
      taskType: task.taskType,
      presetId: task.presetId,
      ratio: task.ratio,
      count: task.count,
      assets: task.assets,
      status: task.status,
      providerTaskId: task.providerTaskId,
      resultUrls: task.resultUrls,
      pointsCost: task.pointsCost,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
