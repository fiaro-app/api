import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

/** Postgres del entorno de desarrollo (`pnpm docker:infra`), si `DATABASE_URL` no dice otra cosa. */
const DEV_DATABASE_URL = 'postgresql://fiaro:fiaro@localhost:5440/fiaro';

const withDatabase = (url: URL, database: string): string => {
  const copy = new URL(url);
  copy.pathname = `/${database}`;
  return copy.toString();
};

/**
 * Crea una base de datos vacía solo para esta corrida, le aplica las migraciones y la publica en
 * `DATABASE_URL` para los workers de Vitest. Al terminar la borra: las pruebas nunca tocan los
 * datos de desarrollo, aunque compartan el mismo servidor.
 */
export async function setup(): Promise<() => Promise<void>> {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const serverUrl = new URL(process.env.DATABASE_URL ?? DEV_DATABASE_URL);
  const database = `fiaro_e2e_${randomBytes(6).toString('hex')}`;

  const admin = new pg.Client({
    connectionString: withDatabase(serverUrl, 'postgres'),
  });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(
      `No se pudo conectar a PostgreSQL en ${serverUrl.host}. Levanta la infraestructura con \`pnpm docker:infra\`. (${(error as Error).message})`,
      { cause: error },
    );
  }
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  const databaseUrl = withDatabase(serverUrl, database);
  execFileSync(
    join(process.cwd(), 'node_modules/.bin/prisma'),
    ['migrate', 'deploy'],
    { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' },
  );
  process.env.DATABASE_URL = databaseUrl;

  return async () => {
    const cleanup = new pg.Client({
      connectionString: withDatabase(serverUrl, 'postgres'),
    });
    await cleanup.connect();
    await cleanup.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await cleanup.end();
  };
}
