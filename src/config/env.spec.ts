import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

describe('loadEnv', () => {
  it('usa valores por defecto seguros cuando solo están las variables obligatorias', () => {
    expect(load()).toEqual({
      nodeEnv: 'development',
      port: 3000,
      corsOrigins: [],
      trustProxy: 0,
      throttle: { ttlMs: 60_000, limit: 100 },
      swaggerEnabled: true,
      logLevel: 'info',
      databaseUrl: REQUIRED_ENV.DATABASE_URL,
      auth: {
        secret: REQUIRED_ENV.BETTER_AUTH_SECRET,
        baseUrl: REQUIRED_ENV.BETTER_AUTH_URL,
        mobileOrigins: [],
      },
    });
  });

  it('convierte cada variable a su tipo', () => {
    const env = load({
      NODE_ENV: 'production',
      PORT: '8080',
      CORS_ORIGINS: 'https://app.fiaro.co,http://localhost:3001',
      TRUST_PROXY: '1',
      THROTTLE_TTL_MS: '30000',
      THROTTLE_LIMIT: '25',
      SWAGGER_ENABLED: 'true',
      LOG_LEVEL: 'warn',
      MOBILE_APP_SCHEMES: 'fiaro',
    });

    expect(env).toEqual({
      nodeEnv: 'production',
      port: 8080,
      corsOrigins: ['https://app.fiaro.co', 'http://localhost:3001'],
      trustProxy: 1,
      throttle: { ttlMs: 30_000, limit: 25 },
      swaggerEnabled: true,
      logLevel: 'warn',
      databaseUrl: REQUIRED_ENV.DATABASE_URL,
      auth: {
        secret: REQUIRED_ENV.BETTER_AUTH_SECRET,
        baseUrl: REQUIRED_ENV.BETTER_AUTH_URL,
        mobileOrigins: ['fiaro://'],
      },
    });
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => load({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('lista todas las variables inválidas en un solo error y no repite sus valores', () => {
    const valorSecreto = 'valor-que-no-debe-aparecer-en-los-logs';
    const claveDeLaBase = 'clave-de-la-base-de-datos';

    let error: unknown;
    try {
      load({
        PORT: valorSecreto,
        THROTTLE_LIMIT: valorSecreto,
        DATABASE_URL: `mysql://usuario:${claveDeLaBase}@localhost:3306/db`,
        BETTER_AUTH_SECRET: valorSecreto.slice(0, 10),
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain('Variables de entorno inválidas');
    expect(message).toContain('PORT');
    expect(message).toContain('THROTTLE_LIMIT');
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('BETTER_AUTH_SECRET');
    expect(message).not.toContain(valorSecreto);
    expect(message).not.toContain(valorSecreto.slice(0, 10));
    expect(message).not.toContain(claveDeLaBase);
  });

  it('lee process.env cuando no se le pasa un origen', () => {
    vi.stubEnv('PORT', '4321');
    vi.stubEnv('DATABASE_URL', REQUIRED_ENV.DATABASE_URL);
    vi.stubEnv('BETTER_AUTH_SECRET', REQUIRED_ENV.BETTER_AUTH_SECRET);
    vi.stubEnv('BETTER_AUTH_URL', REQUIRED_ENV.BETTER_AUTH_URL);
    try {
      expect(loadEnv().port).toBe(4321);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
