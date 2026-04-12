import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { networkInterfaces } from 'os';
import { join } from 'path';
import { AppModule } from './app.module';

function getLocalIpAddress(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('clothing-backend')
    .setDescription('服装 AI 内容生产平台 API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'JWT-auth')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const localIp = getLocalIpAddress();
  console.log('');
  console.log('='.repeat(60));
  console.log('  clothing-backend 已启动');
  console.log('='.repeat(60));
  console.log(`  本机地址:   http://localhost:${port}/api`);
  console.log(`  局域网地址: http://${localIp}:${port}/api`);
  console.log(`  Swagger:    http://localhost:${port}/api/docs`);
  console.log('='.repeat(60));
  console.log('');
  console.log('  前端 app.js 中 apiBaseUrl 请改为:');
  console.log(`  http://${localIp}:${port}/api`);
  console.log('');
}

void bootstrap();
