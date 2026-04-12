import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: { cursor?: string; limit?: number }) {
    const limit = Math.min(query.limit ?? 20, 50);
    const where: any = { userId };

    if (query.cursor) {
      const cursorMsg = await this.prisma.inboxMessage.findUnique({ where: { messageId: query.cursor } });
      if (cursorMsg) where.createdAt = { lt: cursorMsg.createdAt };
    }

    const messages = await this.prisma.inboxMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].messageId : null,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.inboxMessage.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(userId: string, messageId: string) {
    const msg = await this.prisma.inboxMessage.findUnique({ where: { messageId } });
    if (!msg || msg.userId !== userId) throw new NotFoundException('消息不存在');
    await this.prisma.inboxMessage.update({ where: { messageId }, data: { isRead: true } });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.inboxMessage.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { success: true };
  }

  async create(userId: string, data: { messageType: string; title: string; content: string; bizType?: string; bizId?: string }) {
    return this.prisma.inboxMessage.create({
      data: {
        messageId: `msg_${randomUUID()}`,
        userId,
        ...data,
      },
    });
  }
}
