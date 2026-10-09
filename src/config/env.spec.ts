import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { PRODUCTION_ENV, REQUIRED_ENV } from '@test/support/required-env.js';

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
      queuePrefix: 'fiaro',
      auth: {
        secret: REQUIRED_ENV.BETTER_AUTH_SECRET,
        baseUrl: REQUIRED_ENV.BETTER_AUTH_URL,
        mobileOrigins: [],
      },
      email: {
        resendApiKey: undefined,
        fromAddress: undefined,
      },
      leads: { notifyEmail: undefined },
      subscription: {
        trialDays: 30,
        trialMaxActiveLenders: 1,
        trialMaxCollectors: 5,
      },
      maintenanceMode: false,
      mobile: {
        minimumSupportedVersion: '0.0.0',
        latestVersion: '0.0.0',
        downloadUrl: 'https://example.com/fiaro.apk',
      },
      push: {
        delivery: 'log',
        expoAccessToken: undefined,
      },
      moraAlerts: { enabled: true },
      s3: {
        endpoint: 'http://localhost:8333',
        region: 'auto',
        bucket: 'fiaro-dev',
        accessKeyId: 'fiaro',
        secretAccessKey: 'fiaro-secret',
        publicUrlBase: 'http://localhost:8333/fiaro-dev',
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
      QUEUE_PREFIX: 'fiaro-staging',
      MAINTENANCE_MODE: 'true',
      LEADS_NOTIFY_EMAIL: 'ventas@fiaro.co',
      ...PRODUCTION_ENV,
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
      redisUrl: PRODUCTION_ENV.REDIS_URL,
      mongoUri: PRODUCTION_ENV.MONGODB_URI,
      queuePrefix: 'fiaro-staging',
      auth: {
        secret: REQUIRED_ENV.BETTER_AUTH_SECRET,
        baseUrl: REQUIRED_ENV.BETTER_AUTH_URL,
        mobileOrigins: ['fiaro://'],
      },
      email: {
        resendApiKey: PRODUCTION_ENV.RESEND_API_KEY,
        fromAddress: PRODUCTION_ENV.RESEND_FROM_EMAIL,
      },
      leads: { notifyEmail: 'ventas@fiaro.co' },
      subscription: {
        trialDays: 30,
        trialMaxActiveLenders: 1,
        trialMaxCollectors: 5,
      },
      maintenanceMode: true,
      mobile: {
        minimumSupportedVersion: PRODUCTION_ENV.MOBILE_MIN_SUPPORTED_VERSION,
        latestVersion: PRODUCTION_ENV.MOBILE_LATEST_VERSION,
        downloadUrl: PRODUCTION_ENV.MOBILE_DOWNLOAD_URL,
      },
      push: {
        delivery: 'expo',
        expoAccessToken: undefined,
      },
      moraAlerts: { enabled: true },
      s3: {
        endpoint: PRODUCTION_ENV.S3_ENDPOINT,
        region: 'auto',
        bucket: PRODUCTION_ENV.S3_BUCKET,
        accessKeyId: PRODUCTION_ENV.S3_ACCESS_KEY_ID,
        secretAccessKey: PRODUCTION_ENV.S3_SECRET_ACCESS_KEY,
        publicUrlBase: PRODUCTION_ENV.S3_PUBLIC_URL_BASE,
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
