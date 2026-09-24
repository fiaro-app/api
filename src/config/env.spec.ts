import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('usa valores por defecto seguros cuando no hay variables', () => {
    expect(loadEnv({})).toEqual({
      nodeEnv: 'development',
      port: 3000,
      corsOrigins: [],
      trustProxy: 0,
      throttle: { ttlMs: 60_000, limit: 100 },
      swaggerEnabled: true,
    });
  });

  it('convierte cada variable a su tipo', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      CORS_ORIGINS: 'https://app.fiaro.co,http://localhost:3001',
      TRUST_PROXY: '1',
      THROTTLE_TTL_MS: '30000',
      THROTTLE_LIMIT: '25',
      SWAGGER_ENABLED: 'true',
    });

    expect(env).toEqual({
      nodeEnv: 'production',
      port: 8080,
      corsOrigins: ['https://app.fiaro.co', 'http://localhost:3001'],
      trustProxy: 1,
      throttle: { ttlMs: 30_000, limit: 25 },
      swaggerEnabled: true,
    });
  });

  describe('CORS_ORIGINS', () => {
    it('ignora espacios, entradas vacías y duplicados', () => {
      const env = loadEnv({
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
      expect(() => loadEnv({ CORS_ORIGINS: origin })).toThrow(/CORS_ORIGINS/);
    });

    it('indica qué origen de la lista es el inválido', () => {
      expect(() => loadEnv({ CORS_ORIGINS: 'https://app.fiaro.co,*' })).toThrow(
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
      expect(() => loadEnv({ [name]: value })).toThrow(new RegExp(name));
    });
  });

  describe('TRUST_PROXY', () => {
    it('es obligatoria en producción', () => {
      expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(
        /TRUST_PROXY: es obligatoria en producción/,
      );
    });

    it('acepta 0 de forma explícita en producción', () => {
      expect(
        loadEnv({ NODE_ENV: 'production', TRUST_PROXY: '0' }).trustProxy,
      ).toBe(0);
    });

    it('no es obligatoria fuera de producción', () => {
      expect(loadEnv({ NODE_ENV: 'development' }).trustProxy).toBe(0);
      expect(loadEnv({ NODE_ENV: 'test' }).trustProxy).toBe(0);
    });
  });

  describe('SWAGGER_ENABLED', () => {
    it('queda activa fuera de producción y apagada en producción por defecto', () => {
      expect(loadEnv({ NODE_ENV: 'development' }).swaggerEnabled).toBe(true);
      expect(loadEnv({ NODE_ENV: 'test' }).swaggerEnabled).toBe(true);
      expect(
        loadEnv({ NODE_ENV: 'production', TRUST_PROXY: '1' }).swaggerEnabled,
      ).toBe(false);
    });

    it('se puede activar o apagar de forma explícita', () => {
      expect(
        loadEnv({
          NODE_ENV: 'production',
          TRUST_PROXY: '1',
          SWAGGER_ENABLED: 'true',
        }).swaggerEnabled,
      ).toBe(true);
      expect(
        loadEnv({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' })
          .swaggerEnabled,
      ).toBe(false);
    });

    it('rechaza un valor que no es booleano', () => {
      expect(() => loadEnv({ SWAGGER_ENABLED: 'quizás' })).toThrow(
        /SWAGGER_ENABLED/,
      );
    });
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => loadEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('lista todas las variables inválidas en un solo error y no repite sus valores', () => {
    const valorSecreto = 'valor-que-no-debe-aparecer-en-los-logs';

    let error: unknown;
    try {
      loadEnv({ PORT: valorSecreto, THROTTLE_LIMIT: valorSecreto });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain('Variables de entorno inválidas');
    expect(message).toContain('PORT');
    expect(message).toContain('THROTTLE_LIMIT');
    expect(message).not.toContain(valorSecreto);
  });

  it('lee process.env cuando no se le pasa un origen', () => {
    vi.stubEnv('PORT', '4321');
    try {
      expect(loadEnv().port).toBe(4321);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
