import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configuredCorsOrigins } from './config/cors';

function ensureUploadDirs() {
  ['avatars', 'drivers/portraits', 'drivers/licenses', 'drivers/vehicles'].forEach((subdir) => {
    const destination = join(process.cwd(), 'uploads', subdir);
    if (!existsSync(destination)) {
      mkdirSync(destination, { recursive: true });
    }
  });
}

async function bootstrap() {
  ensureUploadDirs();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({ origin: configuredCorsOrigins(), credentials: true });
  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
}

bootstrap();
