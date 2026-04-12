import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { ConfirmAgreementDto } from './dto/confirm-agreement.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly pointsService: PointsService,
  ) {}

  async loginWithWechatCode(dto: WechatLoginDto) {
    const openid = this.resolveWechatOpenid(dto.code);
    const existing = await this.prisma.user.findUnique({ where: { openid } });
    const isNewUser = !existing;

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

    if (isNewUser) {
      this.logger.log(`新用户注册: ${user.userId}，赠送 200 积分`);
      await this.pointsService.recharge(user.userId, 200, `welcome_${user.userId}`, '新用户注册赠送');
    }

    return {
      token: this.signToken(user),
      userId: user.userId,
      openid: user.openid,
      agreementConfirmed: user.agreementConfirmed,
      agreementVersion: user.agreementVersion,
      isNewUser,
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
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      status: user.status,
      agreementConfirmed: user.agreementConfirmed,
      agreementVersion: user.agreementVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private resolveWechatOpenid(code: string): string {
    // TODO: 正式环境替换为真实 jscode2session 调用
    // const { WECHAT_APPID, WECHAT_APP_SECRET } = process.env
    // GET https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code
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
    if (!user) throw new NotFoundException(`User not found: ${userId}`);
    return user;
  }
}
