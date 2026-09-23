import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.js';
import { ENV } from './config/env.token.js';

/**
 * Carga `.env` si existe, sin pisar las variables ya definidas. Debe ejecutarse antes de crear
 * la aplicación, porque `loadEnv()` lee `process.env` al instanciarse.
 */
function loadDotEnv(): void {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
}

loadDotEnv();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  await app.listen(app.get<Env>(ENV).port);
}
await bootstrap();
