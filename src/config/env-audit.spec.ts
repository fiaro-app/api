import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import { PRODUCTION_ENV, REQUIRED_ENV } from '@test/support/required-env.js';

const load = (source: NodeJS.ProcessEnv = {}) =>
  loadEnv({ ...REQUIRED_ENV, ...source });

describe('variables de la auditoría durable', () => {
  describe('REDIS_URL', () => {
    it.each([
      'redis://localhost:6390',
      'redis://default@127.0.0.1:6390',
      'rediss://default:clave@fiaro.upstash.io:6379',
    ])('acepta %s', (url) => {
      expect(load({ REDIS_URL: url }).redisUrl).toBe(url);
    });

    it.each([
      '',
      'localhost:6379',
      'http://localhost:6379',
      'redis://',
      'redis:// x',
    ])('rechaza «%s»', (url) => {
      expect(() => load({ REDIS_URL: url })).toThrow(
        /REDIS_URL: debe ser una URL redis:\/\/ o rediss:\/\//,
      );
    });

    it('no es obligatoria fuera de producción', () => {
      expect(load().redisUrl).toBeUndefined();
      expect(load({ NODE_ENV: 'test' }).redisUrl).toBeUndefined();
    });

    it('la caché usa CACHE_REDIS_URL o, si no está, REDIS_URL (D-118)', () => {
      expect(load({ REDIS_URL: 'redis://localhost:6390' }).cacheRedisUrl).toBe(
        'redis://localhost:6390',
      );
      expect(
        load({
          REDIS_URL: 'redis://localhost:6390',
          CACHE_REDIS_URL: 'redis://cache:6379',
        }).cacheRedisUrl,
      ).toBe('redis://cache:6379');
      expect(load().cacheRedisUrl).toBeUndefined();
    });
  });

  describe('MONGODB_URI', () => {
    it.each([
      'mongodb://fiaro:fiaro@127.0.0.1:27040/fiaro?authSource=admin',
      'mongodb://host1:27017,host2:27017/fiaro?replicaSet=rs0',
      'mongodb+srv://usuario:clave@cluster0.abcde.mongodb.net/fiaro',
    ])('acepta %s', (uri) => {
      expect(load({ MONGODB_URI: uri }).mongoUri).toBe(uri);
    });

    it.each([
      '',
      'mongodb://localhost:27017',
      'mongodb://localhost:27017/',
      'mongodb://localhost:27017/?authSource=admin',
      'postgresql://localhost/fiaro',
    ])('rechaza «%s»', (uri) => {
      expect(() => load({ MONGODB_URI: uri })).toThrow(/MONGODB_URI/);
    });

    it('el error dice que falta el nombre de la base de datos', () => {
      expect(() => load({ MONGODB_URI: 'mongodb://localhost:27017' })).toThrow(
        /incluya el nombre de la base de datos/,
      );
    });

    it('no repite la URI, que lleva la clave', () => {
      const clave = 'clave-que-no-debe-salir';

      expect(() =>
        load({ MONGODB_URI: `http://usuario:${clave}@host/fiaro` }),
      ).toThrow(/MONGODB_URI/);
      try {
        load({ MONGODB_URI: `http://usuario:${clave}@host/fiaro` });
      } catch (error) {
        expect((error as Error).message).not.toContain(clave);
      }
    });
  });

  describe('QUEUE_PREFIX', () => {
    it('por defecto es fiaro', () => {
      expect(load().queuePrefix).toBe('fiaro');
    });

    it.each(['fiaro-staging', 'fiaro_prod', 'A1', 'a'.repeat(40)])(
      'acepta %s',
      (prefix) => {
        expect(load({ QUEUE_PREFIX: prefix }).queuePrefix).toBe(prefix);
      },
    );

    it.each(['', 'con espacios', 'con:dos-puntos', 'a'.repeat(41), 'ñandú'])(
      'rechaza «%s»',
      (prefix) => {
        expect(() => load({ QUEUE_PREFIX: prefix })).toThrow(/QUEUE_PREFIX/);
      },
    );
  });

  describe('en producción', () => {
    const production = { NODE_ENV: 'production', TRUST_PROXY: '1' };

    it('REDIS_URL y MONGODB_URI son obligatorias: sin ellas la auditoría no es durable', () => {
      expect(() => load(production)).toThrow(
        /REDIS_URL: es obligatoria en producción/,
      );
      expect(() => load(production)).toThrow(
        /MONGODB_URI: es obligatoria en producción/,
      );
    });

    it('con una sola, dice cuál falta', () => {
      expect(() =>
        load({ ...production, REDIS_URL: PRODUCTION_ENV.REDIS_URL }),
      ).toThrow(/MONGODB_URI: es obligatoria en producción/);
      expect(() =>
        load({ ...production, MONGODB_URI: PRODUCTION_ENV.MONGODB_URI }),
      ).toThrow(/REDIS_URL: es obligatoria en producción/);
    });

    it('con las dos arranca', () => {
      expect(load({ ...production, ...PRODUCTION_ENV })).toMatchObject({
        redisUrl: PRODUCTION_ENV.REDIS_URL,
        mongoUri: PRODUCTION_ENV.MONGODB_URI,
      });
    });
  });
});
