import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { PRODUCTION_ENV, REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

const PRODUCTION = { NODE_ENV: 'production', TRUST_PROXY: '1' };
const AUDIT_AND_EMAIL_ENV = {
  REDIS_URL: PRODUCTION_ENV.REDIS_URL,
  MONGODB_URI: PRODUCTION_ENV.MONGODB_URI,
  RESEND_API_KEY: PRODUCTION_ENV.RESEND_API_KEY,
  RESEND_FROM_EMAIL: PRODUCTION_ENV.RESEND_FROM_EMAIL,
};

describe('variables del version-gate móvil', () => {
  describe('fuera de producción', () => {
    it('sin ellas, usa valores que nunca bloquean a nadie', () => {
      expect(load().mobile).toEqual({
        minimumSupportedVersion: '0.0.0',
        latestVersion: '0.0.0',
        downloadUrl: 'https://example.com/fiaro.apk',
      });
    });

    it('se guardan tal cual cuando están presentes', () => {
      expect(
        load({
          MOBILE_MIN_SUPPORTED_VERSION: '1.2.0',
          MOBILE_LATEST_VERSION: '1.4.1',
          MOBILE_DOWNLOAD_URL: 'https://fiaro.co/app.apk',
        }).mobile,
      ).toEqual({
        minimumSupportedVersion: '1.2.0',
        latestVersion: '1.4.1',
        downloadUrl: 'https://fiaro.co/app.apk',
      });
    });

    it('MOBILE_MIN_SUPPORTED_VERSION y MOBILE_LATEST_VERSION exigen MAYOR.MENOR.PARCHE', () => {
      expect(() => load({ MOBILE_MIN_SUPPORTED_VERSION: '1.2' })).toThrow(
        /MAYOR\.MENOR\.PARCHE/,
      );
      expect(() => load({ MOBILE_LATEST_VERSION: 'v1.2.0' })).toThrow(
        /MAYOR\.MENOR\.PARCHE/,
      );
    });

    it('MOBILE_DOWNLOAD_URL exige una URL', () => {
      expect(() => load({ MOBILE_DOWNLOAD_URL: 'no-es-una-url' })).toThrow();
    });
  });

  describe('en producción', () => {
    it('las tres son obligatorias: la app las necesita para el bloqueo por versión', () => {
      expect(() =>
        load({ ...PRODUCTION, ...AUDIT_AND_EMAIL_ENV, ...PRODUCTION_ENV }),
      ).not.toThrow();
      expect(() => load({ ...PRODUCTION, ...AUDIT_AND_EMAIL_ENV })).toThrow(
        /MOBILE_MIN_SUPPORTED_VERSION: es obligatoria en producción/,
      );
    });

    it('con las otras dos presentes, dice cuál falta', () => {
      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_AND_EMAIL_ENV,
          MOBILE_LATEST_VERSION: PRODUCTION_ENV.MOBILE_LATEST_VERSION,
          MOBILE_DOWNLOAD_URL: PRODUCTION_ENV.MOBILE_DOWNLOAD_URL,
        }),
      ).toThrow(/MOBILE_MIN_SUPPORTED_VERSION: es obligatoria en producción/);
      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_AND_EMAIL_ENV,
          MOBILE_MIN_SUPPORTED_VERSION:
            PRODUCTION_ENV.MOBILE_MIN_SUPPORTED_VERSION,
          MOBILE_DOWNLOAD_URL: PRODUCTION_ENV.MOBILE_DOWNLOAD_URL,
        }),
      ).toThrow(/MOBILE_LATEST_VERSION: es obligatoria en producción/);
      expect(() =>
        load({
          ...PRODUCTION,
          ...AUDIT_AND_EMAIL_ENV,
          MOBILE_MIN_SUPPORTED_VERSION:
            PRODUCTION_ENV.MOBILE_MIN_SUPPORTED_VERSION,
          MOBILE_LATEST_VERSION: PRODUCTION_ENV.MOBILE_LATEST_VERSION,
        }),
      ).toThrow(/MOBILE_DOWNLOAD_URL: es obligatoria en producción/);
    });

    it('con las tres arranca', () => {
      expect(
        load({
          ...PRODUCTION,
          ...AUDIT_AND_EMAIL_ENV,
          ...PRODUCTION_ENV,
        }).mobile,
      ).toEqual({
        minimumSupportedVersion: PRODUCTION_ENV.MOBILE_MIN_SUPPORTED_VERSION,
        latestVersion: PRODUCTION_ENV.MOBILE_LATEST_VERSION,
        downloadUrl: PRODUCTION_ENV.MOBILE_DOWNLOAD_URL,
      });
    });
  });
});

describe('MAINTENANCE_MODE', () => {
  it('no es obligatoria en ningún entorno, y por defecto es false', () => {
    expect(load().maintenanceMode).toBe(false);
    expect(
      load({
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
        ...AUDIT_AND_EMAIL_ENV,
        ...PRODUCTION_ENV,
      }).maintenanceMode,
    ).toBe(false);
  });

  it('se interpreta como booleano', () => {
    expect(load({ MAINTENANCE_MODE: 'true' }).maintenanceMode).toBe(true);
    expect(load({ MAINTENANCE_MODE: 'false' }).maintenanceMode).toBe(false);
  });
});
