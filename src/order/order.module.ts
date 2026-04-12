import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PointsModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
