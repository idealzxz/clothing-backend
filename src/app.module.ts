import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssetModule } from './asset/asset.module';
import { AuthModule } from './auth/auth.module';
import { ConfigBizModule } from './config-biz/config-biz.module';
import { GenerationModule } from './generation/generation.module';
import { MessageModule } from './message/message.module';
import { OrderModule } from './order/order.module';
import { PointsModule } from './points/points.module';
import { PresetModule } from './preset/preset.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipeModule } from './recipe/recipe.module';
import { UserModule } from './user/user.module';
import { WorkModule } from './work/work.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PointsModule,
    GenerationModule,
    AssetModule,
    WorkModule,
    PresetModule,
    UserModule,
    RecipeModule,
    MessageModule,
    OrderModule,
    ConfigBizModule,
  ],
})
export class AppModule {}
