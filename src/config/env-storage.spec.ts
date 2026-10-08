import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { PRODUCTION_ENV, REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

const PRODUCTION = { NODE_ENV: 'production', TRUST_PROXY: '1' };
const AUDIT_EMAIL_AND_MOBILE_ENV = {
  REDIS_URL: PRODUCTION_ENV.REDIS_URL,
  MONGODB_URI: PRODUCTION_ENV.MONGODB_URI,
  RESEND_API_KEY: PRODUCTION_ENV.RESEND_API_KEY,
  RESEND_FROM_EMAIL: PRODUCTION_ENV.RESEND_FROM_EMAIL,
  MOBILE_MIN_SUPPORTED_VERSION: PRODUCTION_ENV.MOBILE_MIN_SUPPORTED_VERSION,
  MOBILE_LATEST_VERSION: PRODUCTION_ENV.MOBILE_LATEST_VERSION,
  MOBILE_DOWNLOAD_URL: PRODUCTION_ENV.MOBILE_DOWNLOAD_URL,
};

describe('variables de la subida del logo (S3/R2)', () => {
  describe('fuera de producción', () => {
    it('sin ellas, usa las credenciales de pnpm docker:dev', () => {
      expect(load().s3).toEqual({
        endpoint: 'http://localhost:8333',
        region: 'auto',
        bucket: 'fiaro-dev',
        accessKeyId: 'fiaro',
        secretAccessKey: 'fiaro-secret',
        publicUrlBase: 'http://localhost:8333/fiaro-dev',
      });
    });

    it('se guardan tal cual cuando están presentes', () => {
      expect(
        load({
          S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
          S3_REGION: 'weur',
          S3_BUCKET: 'otro-bucket',
          S3_ACCESS_KEY_ID: 'otra-llave',
          S3_SECRET_ACCESS_KEY: 'otro-secreto',
          S3_PUBLIC_URL_BASE: 'https://assets.example.com',
        }).s3,
      ).toEqual({
        endpoint: 'https://example.r2.cloudflarestorage.com',
        region: 'weur',
        bucket: 'otro-bucket',
        accessKeyId: 'otra-llave',
        secretAccessKey: 'otro-secreto',
        publicUrlBase: 'https://assets.example.com',
      });
    });

    it('S3_ENDPOINT y S3_PUBLIC_URL_BASE exigen una URL', () => {
      expect(() => load({ S3_ENDPOINT: 'no-es-una-url' })).toThrow();
      expect(() => load({ S3_PUBLIC_URL_BASE: 'no-es-una-url' })).toThrow();
    });
  });

  describe('en producción', () => {
    it('las cinco son obligatorias: la subida del logo las necesita para firmar la URL', () => {
      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_EMAIL_AND_MOBILE_ENV,
          ...PRODUCTION_ENV,
        }),
      ).not.toThrow();
      expect(() =>
        load({ ...PRODUCTION, ...AUDIT_EMAIL_AND_MOBILE_ENV }),
      ).toThrow(/S3_ENDPOINT: es obligatoria en producción/);
    });

    it('con las demás, dice cuál falta', () => {
      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_EMAIL_AND_MOBILE_ENV,
          ...PRODUCTION_ENV,
          S3_ENDPOINT: undefined,
        }),
      ).toThrow(/S3_ENDPOINT: es obligatoria en producción/);

      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_EMAIL_AND_MOBILE_ENV,
          ...PRODUCTION_ENV,
          S3_BUCKET: undefined,
        }),
      ).toThrow(/S3_BUCKET: es obligatoria en producción/);

      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_EMAIL_AND_MOBILE_ENV,
          ...PRODUCTION_ENV,
          S3_ACCESS_KEY_ID: undefined,
        }),
      ).toThrow(/S3_ACCESS_KEY_ID: es obligatoria en producción/);

      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_EMAIL_AND_MOBILE_ENV,
          ...PRODUCTION_ENV,
          S3_SECRET_ACCESS_KEY: undefined,
        }),
      ).toThrow(/S3_SECRET_ACCESS_KEY: es obligatoria en producción/);

      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_EMAIL_AND_MOBILE_ENV,
          ...PRODUCTION_ENV,
          S3_PUBLIC_URL_BASE: undefined,
        }),
      ).toThrow(/S3_PUBLIC_URL_BASE: es obligatoria en producción/);
    });

    it('con las cinco arranca', () => {
      expect(
        load({
          ...PRODUCTION,
          ...AUDIT_EMAIL_AND_MOBILE_ENV,
          ...PRODUCTION_ENV,
        }).s3,
      ).toEqual({
        endpoint: PRODUCTION_ENV.S3_ENDPOINT,
        region: 'auto',
        bucket: PRODUCTION_ENV.S3_BUCKET,
        accessKeyId: PRODUCTION_ENV.S3_ACCESS_KEY_ID,
        secretAccessKey: PRODUCTION_ENV.S3_SECRET_ACCESS_KEY,
        publicUrlBase: PRODUCTION_ENV.S3_PUBLIC_URL_BASE,
      });
    });
  });
});
