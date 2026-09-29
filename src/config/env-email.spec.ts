import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { PRODUCTION_ENV, REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

describe('variables del envío de correos (Resend)', () => {
  describe('RESEND_API_KEY', () => {
    it('no es obligatoria fuera de producción', () => {
      expect(load().email.resendApiKey).toBeUndefined();
      expect(load({ NODE_ENV: 'test' }).email.resendApiKey).toBeUndefined();
    });

    it('se guarda tal cual cuando está presente', () => {
      expect(load({ RESEND_API_KEY: 're_123' }).email.resendApiKey).toBe(
        're_123',
      );
    });
  });

  describe('RESEND_FROM_EMAIL', () => {
    it('no es obligatoria fuera de producción', () => {
      expect(load().email.fromAddress).toBeUndefined();
      expect(load({ NODE_ENV: 'test' }).email.fromAddress).toBeUndefined();
    });

    it('se guarda tal cual cuando está presente', () => {
      expect(
        load({ RESEND_FROM_EMAIL: 'Fiaro <no-reply@fiaro.example>' }).email
          .fromAddress,
      ).toBe('Fiaro <no-reply@fiaro.example>');
    });
  });

  describe('en producción', () => {
    const production = { NODE_ENV: 'production', TRUST_PROXY: '1' };

    it('RESEND_API_KEY y RESEND_FROM_EMAIL son obligatorias: sin ellas no se pueden enviar correos', () => {
      expect(() => load({ ...production, ...PRODUCTION_ENV })).not.toThrow();
      expect(() =>
        load({
          ...production,
          REDIS_URL: PRODUCTION_ENV.REDIS_URL,
          MONGODB_URI: PRODUCTION_ENV.MONGODB_URI,
        }),
      ).toThrow(/RESEND_API_KEY: es obligatoria en producción/);
      expect(() =>
        load({
          ...production,
          REDIS_URL: PRODUCTION_ENV.REDIS_URL,
          MONGODB_URI: PRODUCTION_ENV.MONGODB_URI,
        }),
      ).toThrow(/RESEND_FROM_EMAIL: es obligatoria en producción/);
    });

    it('una cadena vacía cuenta como si faltara', () => {
      expect(() =>
        load({
          ...production,
          ...PRODUCTION_ENV,
          RESEND_API_KEY: '',
        }),
      ).toThrow(/RESEND_API_KEY: es obligatoria en producción/);
    });

    it('con una sola, dice cuál falta', () => {
      expect(() =>
        load({
          ...production,
          REDIS_URL: PRODUCTION_ENV.REDIS_URL,
          MONGODB_URI: PRODUCTION_ENV.MONGODB_URI,
          RESEND_API_KEY: PRODUCTION_ENV.RESEND_API_KEY,
        }),
      ).toThrow(/RESEND_FROM_EMAIL: es obligatoria en producción/);
      expect(() =>
        load({
          ...production,
          REDIS_URL: PRODUCTION_ENV.REDIS_URL,
          MONGODB_URI: PRODUCTION_ENV.MONGODB_URI,
          RESEND_FROM_EMAIL: PRODUCTION_ENV.RESEND_FROM_EMAIL,
        }),
      ).toThrow(/RESEND_API_KEY: es obligatoria en producción/);
    });

    it('con las dos arranca', () => {
      expect(load({ ...production, ...PRODUCTION_ENV }).email).toEqual({
        resendApiKey: PRODUCTION_ENV.RESEND_API_KEY,
        fromAddress: PRODUCTION_ENV.RESEND_FROM_EMAIL,
      });
    });
  });
});
