import { Module } from '@nestjs/common';
import { ConfigBizController } from './config-biz.controller';
import { ConfigBizService } from './config-biz.service';

@Module({
  controllers: [ConfigBizController],
  providers: [ConfigBizService],
})
export class ConfigBizModule {}
