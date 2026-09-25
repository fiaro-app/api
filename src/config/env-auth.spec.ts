import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

describe('variables de la base de datos y la autenticación', () => {
  describe('DATABASE_URL', () => {
    it.each(['postgresql://u:p@localhost:5432/db', 'postgres://u:p@host/db'])(
      'acepta %s',
      (url) => {
        expect(load({ DATABASE_URL: url }).databaseUrl).toBe(url);
      },
    );

    it.each([
      ['falta', undefined],
      ['está vacía', ''],
      ['no es una URL', 'localhost:5432/db'],
      ['no es de PostgreSQL', 'mysql://u:p@localhost:3306/db'],
    ])('se rechaza si %s', (_caso, value) => {
      expect(() => load({ DATABASE_URL: value })).toThrow(/DATABASE_URL/);
    });
  });

  describe('BETTER_AUTH_SECRET', () => {
    it('exige al menos 32 caracteres', () => {
      expect(() => load({ BETTER_AUTH_SECRET: 'a'.repeat(31) })).toThrow(
        /BETTER_AUTH_SECRET: debe tener al menos 32 caracteres/,
      );
      expect(load({ BETTER_AUTH_SECRET: 'a'.repeat(32) }).auth.secret).toBe(
        'a'.repeat(32),
      );
    });

    it('es obligatoria en todos los entornos', () => {
      expect(() => load({ BETTER_AUTH_SECRET: undefined })).toThrow(
        /BETTER_AUTH_SECRET/,
      );
    });
  });

  describe('BETTER_AUTH_URL', () => {
    it('acepta el origen de la API', () => {
      expect(
        load({ BETTER_AUTH_URL: 'https://api.fiaro.co' }).auth.baseUrl,
      ).toBe('https://api.fiaro.co');
    });

    it.each([
      ['falta', undefined],
      ['lleva barra final', 'https://api.fiaro.co/'],
      ['lleva ruta', 'https://api.fiaro.co/auth'],
      ['no es http(s)', 'fiaro://api'],
    ])('se rechaza si %s', (_caso, value) => {
      expect(() => load({ BETTER_AUTH_URL: value })).toThrow(/BETTER_AUTH_URL/);
    });
  });

  describe('MOBILE_APP_SCHEMES', () => {
    it('convierte cada esquema en el origen que envía la app y descarta duplicados', () => {
      const env = load({ MOBILE_APP_SCHEMES: ' fiaro , fiaro-dev,fiaro,' });

      expect(env.auth.mobileOrigins).toEqual(['fiaro://', 'fiaro-dev://']);
    });

    it.each([
      ['con mayúsculas', 'Fiaro'],
      ['con los dos puntos y las barras', 'fiaro://'],
      ['que empieza por un número', '1fiaro'],
    ])('rechaza un esquema %s', (_caso, scheme) => {
      expect(() => load({ MOBILE_APP_SCHEMES: scheme })).toThrow(
        /MOBILE_APP_SCHEMES/,
      );
    });
  });
});
