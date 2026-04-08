import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmAgreementDto } from './dto/confirm-agreement.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async loginWithWechatCode(dto: WechatLoginDto) {
    const openid = this.resolveWechatOpenid(dto.code);
    const user = await this.prisma.user.upsert({
      where: { openid },
      create: {
        userId: randomUUID(),
        openid,
        agreementConfirmed: false,
        agreementVersion: null,
      },
      update: {},
    });

    return {
      token: this.signToken(user),
      userId: user.userId,
      openid: user.openid,
      agreementConfirmed: user.agreementConfirmed,
      agreementVersion: user.agreementVersion,
    };
  }

  async confirmAgreement(userId: string, dto: ConfirmAgreementDto) {
    const user = await this.requireUser(userId);
    const updated = await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        agreementConfirmed: true,
        agreementVersion: dto.agreementVersion,
      },
    });
    return {
      agreementConfirmed: true,
      agreementVersion: updated.agreementVersion,
      token: this.signToken(updated),
    };
  }

  async getProfile(userId: string) {
    const user = await this.requireUser(userId);
    return {
      userId: user.userId,
      openid: user.openid,
      agreementConfirmed: user.agreementConfirmed,
      agreementVersion: user.agreementVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private resolveWechatOpenid(code: string): string {
    return `wx_${code.slice(0, 16)}`;
  }

  private signToken(user: {
    userId: string;
    openid: string;
    agreementConfirmed: boolean;
    agreementVersion: string | null;
  }): string {
    return this.jwtService.sign({
      sub: user.userId,
      openid: user.openid,
      agreementConfirmed: user.agreementConfirmed,
      agreementVersion: user.agreementVersion,
    });
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }
    return user;
  }
}
