import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pointsService: PointsService,
  ) {}

  async listPackages() {
    return this.prisma.pointsPackage.findMany({ where: { status: true }, orderBy: { amount: 'asc' } });
  }

  async createOrder(userId: string, data: { packageId: number }) {
    const pkg = await this.prisma.pointsPackage.findUnique({ where: { id: data.packageId } });
    if (!pkg || !pkg.status) throw new NotFoundException('积分包不存在或已下架');

    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);
    return this.prisma.pointsOrder.create({
      data: {
        orderId: `order_${randomUUID()}`,
        userId,
        packageId: pkg.id,
        packageName: pkg.packageName,
        originalPoints: pkg.originalPoints,
        giftPoints: pkg.giftPoints,
        totalPoints: pkg.totalPoints,
        amount: pkg.amount,
        expiredAt,
      },
    });
  }

  async listOrders(userId: string) {
    return this.prisma.pointsOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.pointsOrder.findUnique({ where: { orderId } });
    if (!order || order.userId !== userId) throw new NotFoundException('订单不存在');
    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.pointsOrder.findUnique({ where: { orderId } });
    if (!order || order.userId !== userId) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending') throw new BadRequestException('订单状态不允许取消');
    await this.prisma.pointsOrder.update({ where: { orderId }, data: { status: 'cancelled' } });
    return { success: true };
  }

  async mockPay(userId: string, orderId: string) {
    const order = await this.prisma.pointsOrder.findUnique({ where: { orderId } });
    if (!order || order.userId !== userId) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending') throw new BadRequestException('订单状态不允许支付');
    if (new Date() > order.expiredAt) {
      await this.prisma.pointsOrder.update({ where: { orderId }, data: { status: 'closed' } });
      throw new BadRequestException('订单已过期');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pointsOrder.update({
        where: { orderId },
        data: {
          status: 'paid',
          payChannel: 'mock',
          paidAt: new Date(),
          wechatPaidAt: new Date(),
          wechatTradeNo: `mock_${Date.now()}`,
        },
      });
      await this.pointsService.recharge(
        userId,
        order.totalPoints,
        orderId,
        `购买${order.packageName}`,
        tx,
      );
    });

    return { success: true, totalPoints: order.totalPoints };
  }
}
