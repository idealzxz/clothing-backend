import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { DeductPointsDto } from './dto/deduct-points.dto';
import { FreezePointsDto } from './dto/freeze-points.dto';
import { RechargePointsDto } from './dto/recharge-points.dto';
import { ThawPointsDto } from './dto/thaw-points.dto';
import { PointsService } from './points.service';

@ApiTags('points')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  @ApiOperation({ summary: '积分余额' })
  getBalance(@CurrentUser() user: RequestUser) {
    return this.pointsService.getBalance(user.userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: '积分流水' })
  transactions(@CurrentUser() user: RequestUser) {
    return this.pointsService.listTransactions(user.userId);
  }

  @Post('recharge')
  @ApiOperation({ summary: '充值积分' })
  recharge(@CurrentUser() user: RequestUser, @Body() dto: RechargePointsDto) {
    return this.pointsService.recharge(
      user.userId,
      dto.amount,
      dto.bizId ?? `manual_recharge_${Date.now()}`,
      dto.remark,
    );
  }

  @Post('freeze')
  @ApiOperation({ summary: '冻结积分' })
  freeze(@CurrentUser() user: RequestUser, @Body() dto: FreezePointsDto) {
    return this.pointsService.freeze(user.userId, dto.amount, dto.bizId);
  }

  @Post('deduct')
  @ApiOperation({ summary: '扣减积分' })
  deduct(@CurrentUser() user: RequestUser, @Body() dto: DeductPointsDto) {
    return this.pointsService.deduct(user.userId, dto.amount, dto.bizId);
  }

  @Post('thaw')
  @ApiOperation({ summary: '解冻积分' })
  thaw(@CurrentUser() user: RequestUser, @Body() dto: ThawPointsDto) {
    return this.pointsService.thaw(user.userId, dto.amount, dto.bizId);
  }
}
