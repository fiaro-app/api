import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { PRODUCTION_ENV, REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

describe('variables de la configuración HTTP', () => {
  describe('CORS_ORIGINS', () => {
    it('ignora espacios, entradas vacías y duplicados', () => {
      const env = load({
        CORS_ORIGINS:
          ' https://app.fiaro.co , ,https://app.fiaro.co,http://localhost:3001,',
      });

      expect(env.corsOrigins).toEqual([
        'https://app.fiaro.co',
        'http://localhost:3001',
      ]);
    });

    it.each([
      ['un comodín', '*'],
      ['una barra final', 'https://app.fiaro.co/'],
      ['una ruta', 'https://app.fiaro.co/panel'],
      ['un esquema que no es http(s)', 'ftp://app.fiaro.co'],
      ['mayúsculas en el host', 'https://APP.fiaro.co'],
      ['un texto que no es una URL', 'app.fiaro.co'],
    ])('rechaza %s', (_caso, origin) => {
      expect(() => load({ CORS_ORIGINS: origin })).toThrow(/CORS_ORIGINS/);
    });

    it('indica qué origen de la lista es el inválido', () => {
      expect(() => load({ CORS_ORIGINS: 'https://app.fiaro.co,*' })).toThrow(
        /CORS_ORIGINS\.1/,
      );
    });
  });

  describe('valores numéricos', () => {
    it.each([
      ['PORT', ''],
      ['PORT', '0'],
      ['PORT', '65536'],
      ['PORT', 'abc'],
      ['PORT', '3000.5'],
      ['PORT', '-1'],
      ['PORT', '1e3'],
      ['PORT', '0x10'],
      ['TRUST_PROXY', ''],
      ['TRUST_PROXY', '11'],
      ['THROTTLE_TTL_MS', '999'],
      ['THROTTLE_LIMIT', '0'],
    ])('rechaza %s=%j', (name, value) => {
      expect(() => load({ [name]: value })).toThrow(new RegExp(name));
    });
  });

  describe('TRUST_PROXY', () => {
    it('es obligatoria en producción', () => {
      expect(() => load({ NODE_ENV: 'production' })).toThrow(
        /TRUST_PROXY: es obligatoria en producción/,
      );
    });

    it('acepta 0 de forma explícita en producción', () => {
      expect(
        load({ NODE_ENV: 'production', TRUST_PROXY: '0', ...PRODUCTION_ENV })
          .trustProxy,
      ).toBe(0);
    });

    it('no es obligatoria fuera de producción', () => {
      expect(load({ NODE_ENV: 'development' }).trustProxy).toBe(0);
      expect(load({ NODE_ENV: 'test' }).trustProxy).toBe(0);
    });
  });

  describe('SWAGGER_ENABLED', () => {
    it('queda activa fuera de producción y apagada en producción por defecto', () => {
      expect(load({ NODE_ENV: 'development' }).swaggerEnabled).toBe(true);
      expect(load({ NODE_ENV: 'test' }).swaggerEnabled).toBe(true);
      expect(
        load({ NODE_ENV: 'production', TRUST_PROXY: '1', ...PRODUCTION_ENV })
          .swaggerEnabled,
      ).toBe(false);
    });

    it('se puede activar o apagar de forma explícita', () => {
      expect(
        load({
          NODE_ENV: 'production',
          TRUST_PROXY: '1',
          SWAGGER_ENABLED: 'true',
          ...PRODUCTION_ENV,
        }).swaggerEnabled,
      ).toBe(true);
      expect(
        load({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' })
          .swaggerEnabled,
      ).toBe(false);
    });

    it('rechaza un valor que no es booleano', () => {
      expect(() => load({ SWAGGER_ENABLED: 'quizás' })).toThrow(
        /SWAGGER_ENABLED/,
      );
    });
  });
});
