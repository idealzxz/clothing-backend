import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type PointsTransactionType = 'recharge' | 'freeze' | 'deduct' | 'thaw';

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    return this.getOrCreateAccount(userId);
  }

  async recharge(
    userId: string,
    amount: number,
    bizId: string,
    remark?: string,
    txClient?: Prisma.TransactionClient,
  ) {
    if (txClient) {
      return this.rechargeWithTx(txClient, userId, amount, bizId, remark);
    }
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return this.rechargeWithTx(tx, userId, amount, bizId, remark);
    });
  }

  async freeze(
    userId: string,
    amount: number,
    bizId: string,
    txClient?: Prisma.TransactionClient,
  ) {
    if (txClient) {
      return this.freezeWithTx(txClient, userId, amount, bizId);
    }
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return this.freezeWithTx(tx, userId, amount, bizId);
    });
  }

  async deduct(
    userId: string,
    amount: number,
    bizId: string,
    txClient?: Prisma.TransactionClient,
  ) {
    if (txClient) {
      return this.deductWithTx(txClient, userId, amount, bizId);
    }
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return this.deductWithTx(tx, userId, amount, bizId);
    });
  }

  async thaw(
    userId: string,
    amount: number,
    bizId: string,
    txClient?: Prisma.TransactionClient,
  ) {
    if (txClient) {
      return this.thawWithTx(txClient, userId, amount, bizId);
    }
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return this.thawWithTx(tx, userId, amount, bizId);
    });
  }

  async listTransactions(userId: string) {
    return this.prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async rechargeWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    bizId: string,
    remark?: string,
  ) {
      const account = await this.getOrCreateAccount(userId, tx);
      const beforeAvailable = account.availableBalance;
      const beforeFrozen = account.frozenBalance;

      await tx.pointsAccount.update({
        where: { userId },
        data: { availableBalance: { increment: amount } },
      });
      const updated = await tx.pointsAccount.findUniqueOrThrow({ where: { userId } });
      await this.pushTransaction(
        tx,
        {
          userId,
          type: 'recharge',
          amount,
          bizId,
          remark,
          balanceBefore: beforeAvailable,
          balanceAfter: updated.availableBalance,
          frozenBefore: beforeFrozen,
          frozenAfter: updated.frozenBalance,
        },
      );
      return updated;
  }

  private async freezeWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    bizId: string,
  ) {
      const account = await this.getOrCreateAccount(userId, tx);
      const beforeAvailable = account.availableBalance;
      const beforeFrozen = account.frozenBalance;

      const updatedCount = await tx.pointsAccount.updateMany({
        where: { userId, availableBalance: { gte: amount } },
        data: {
          availableBalance: { decrement: amount },
          frozenBalance: { increment: amount },
        },
      });
      if (updatedCount.count === 0) {
        throw new BadRequestException('积分不足，无法冻结');
      }
      const updated = await tx.pointsAccount.findUniqueOrThrow({ where: { userId } });
      await this.pushTransaction(tx, {
        userId,
        type: 'freeze',
        amount: -amount,
        bizId,
        balanceBefore: beforeAvailable,
        balanceAfter: updated.availableBalance,
        frozenBefore: beforeFrozen,
        frozenAfter: updated.frozenBalance,
      });
      return updated;
  }

  private async deductWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    bizId: string,
  ) {
      const account = await this.getOrCreateAccount(userId, tx);
      const beforeAvailable = account.availableBalance;
      const beforeFrozen = account.frozenBalance;

      const updatedCount = await tx.pointsAccount.updateMany({
        where: { userId, frozenBalance: { gte: amount } },
        data: { frozenBalance: { decrement: amount } },
      });
      if (updatedCount.count === 0) {
        throw new BadRequestException('冻结积分不足，无法扣减');
      }
      const updated = await tx.pointsAccount.findUniqueOrThrow({ where: { userId } });
      await this.pushTransaction(tx, {
        userId,
        type: 'deduct',
        amount: -amount,
        bizId,
        balanceBefore: beforeAvailable,
        balanceAfter: updated.availableBalance,
        frozenBefore: beforeFrozen,
        frozenAfter: updated.frozenBalance,
      });
      return updated;
  }

  private async thawWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    bizId: string,
  ) {
      const account = await this.getOrCreateAccount(userId, tx);
      const beforeAvailable = account.availableBalance;
      const beforeFrozen = account.frozenBalance;

      const updatedCount = await tx.pointsAccount.updateMany({
        where: { userId, frozenBalance: { gte: amount } },
        data: {
          frozenBalance: { decrement: amount },
          availableBalance: { increment: amount },
        },
      });
      if (updatedCount.count === 0) {
        throw new BadRequestException('冻结积分不足，无法解冻');
      }
      const updated = await tx.pointsAccount.findUniqueOrThrow({ where: { userId } });
      await this.pushTransaction(tx, {
        userId,
        type: 'thaw',
        amount,
        bizId,
        balanceBefore: beforeAvailable,
        balanceAfter: updated.availableBalance,
        frozenBefore: beforeFrozen,
        frozenAfter: updated.frozenBalance,
      });
      return updated;
  }

  private async getOrCreateAccount(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.pointsAccount.upsert({
      where: { userId },
      update: {},
      create: { userId, availableBalance: 0, frozenBalance: 0 },
    });
  }

  private async pushTransaction(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      type: PointsTransactionType;
      amount: number;
      bizId: string;
      balanceBefore: number;
      balanceAfter: number;
      frozenBefore: number;
      frozenAfter: number;
      remark?: string;
    },
  ) {
    await tx.pointsTransaction.create({
      data: {
        ...input,
        transactionId: randomUUID(),
      },
    });
  }
}
