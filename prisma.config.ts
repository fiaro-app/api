import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'src/shared/infrastructure/persistence/schema',
  migrations: { path: 'src/shared/infrastructure/persistence/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
