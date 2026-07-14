import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // All backend routes live under /api so a single reverse proxy serves the SPA
  // at / and forwards /api to the backend without route collisions (e.g. /me
  // exists both as an SPA page and an API endpoint).
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Single, restrictive CORS config (the earlier `origin: true` reflected any
  // origin with credentials, defeating this one).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
