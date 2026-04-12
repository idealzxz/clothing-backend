import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@ApiTags('orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('packages')
  @ApiOperation({ summary: '获取可购买积分包列表' })
  listPackages() {
    return this.orderService.listPackages();
  }

  @Post('create')
  @ApiOperation({ summary: '创建积分充值订单' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(user.userId, dto);
  }

  @Get('list')
  @ApiOperation({ summary: '用户订单列表' })
  list(@CurrentUser() user: RequestUser) {
    return this.orderService.listOrders(user.userId);
  }

  @Get(':orderId')
  @ApiOperation({ summary: '订单详情' })
  getOrder(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.orderService.getOrder(user.userId, orderId);
  }

  @Post(':orderId/cancel')
  @ApiOperation({ summary: '取消订单' })
  cancel(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.orderService.cancelOrder(user.userId, orderId);
  }

  @Post(':orderId/mock-pay')
  @ApiOperation({ summary: '模拟支付（本地调试用）' })
  mockPay(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.orderService.mockPay(user.userId, orderId);
  }
}
