import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { JimengProvider } from './providers/jimeng.provider';

@Module({
  imports: [PointsModule],
  controllers: [GenerationController],
  providers: [GenerationService, JimengProvider],
})
export class GenerationModule {}
