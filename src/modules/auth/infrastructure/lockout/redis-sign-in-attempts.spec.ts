import { afterEach, describe, expect, it, vi } from 'vitest';
import { RedisSignInAttempts } from '@/modules/auth/infrastructure/lockout/redis-sign-in-attempts.js';

const NOT_AN_ERROR = 'texto suelto' as unknown as Error;

function setup(
  reply: unknown = [1, 900],
  maxAttempts = 5,
  windowSeconds = 900,
) {
  const redis = {
    eval: vi.fn(() => Promise.resolve(reply)),
    del: vi.fn(() => Promise.resolve(1)),
    disconnect: vi.fn(),
  };
  const warn = vi.fn();
  const attempts = new RedisSignInAttempts(
    redis,
    'fiaro:sign-in-attempts',
    warn,
    maxAttempts,
    windowSeconds,
  );
  return { attempts, redis, warn };
}

describe('RedisSignInAttempts', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('register', () => {
    it('suma el intento en un solo comando, con la llave del celular y la ventana', async () => {
      const { attempts, redis } = setup([1, 900]);

      await attempts.register('huella');

      expect(redis.eval).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining("redis.call('INCR', KEYS[1])"),
        1,
        'fiaro:sign-in-attempts:huella',
        '900',
      );
    });

    it('deja pasar el intento si la cuenta cabe en el límite', async () => {
      const { attempts } = setup([5, 100]);

      expect(await attempts.register('huella')).toEqual({
        allowed: true,
        retryAfterSeconds: 0,
      });
    });

    it('bloquea el intento que se pasa y dice cuánto le falta a la ventana', async () => {
      const { attempts } = setup([6, 612]);

      expect(await attempts.register('huella')).toEqual({
        allowed: false,
        retryAfterSeconds: 612,
      });
    });

    it('nunca anuncia menos de un segundo, aunque Redis diga que la llave vence ya o no venza', async () => {
      const { attempts } = setup([6, 0]);
      expect((await attempts.register('h')).retryAfterSeconds).toBe(1);

      const other = setup([6, -1]);
      expect((await other.attempts.register('h')).retryAfterSeconds).toBe(1);
    });

    it('con otro límite usa ese', async () => {
      const { attempts } = setup([3, 10], 2);

      expect((await attempts.register('h')).allowed).toBe(false);
    });

    it('si Redis falla deja pasar el intento y avisa con el motivo', async () => {
      const { attempts, redis, warn } = setup();
      redis.eval.mockRejectedValueOnce(new Error('Connection is closed.'));

      expect(await attempts.register('h')).toEqual({
        allowed: true,
        retryAfterSeconds: 0,
      });
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        'No se pudo contar un intento de inicio de sesión: Connection is closed.',
      );
    });

    it('un rechazo que no es un Error se avisa como desconocido', async () => {
      const { attempts, redis, warn } = setup();
      redis.eval.mockRejectedValueOnce(NOT_AN_ERROR);

      await attempts.register('h');

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('error desconocido'),
      );
    });

    it.each([
      ['un texto', 'OK'],
      ['una lista corta', [1]],
      ['una lista de textos', ['1', '2']],
    ])(
      'si Redis contesta %s, que el script no daría, deja pasar y avisa',
      async (_caso, reply) => {
        const { attempts, warn } = setup(reply);

        expect((await attempts.register('h')).allowed).toBe(true);
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('Respuesta inesperada'),
        );
      },
    );

    it('si Redis no contesta en un segundo deja pasar el intento: iniciar sesión no espera a Redis', async () => {
      vi.useFakeTimers();
      const { attempts, redis, warn } = setup();
      redis.eval.mockReturnValueOnce(new Promise(() => undefined));

      const pending = attempts.register('h');
      await vi.advanceTimersByTimeAsync(1_000);

      expect((await pending).allowed).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('sin respuesta en 1000 ms'),
      );
    });
  });

  describe('clear', () => {
    it('borra la llave del celular', async () => {
      const { attempts, redis } = setup();

      await attempts.clear('huella');

      expect(redis.del).toHaveBeenCalledExactlyOnceWith(
        'fiaro:sign-in-attempts:huella',
      );
    });

    it('si Redis falla no propaga el error y avisa', async () => {
      const { attempts, redis, warn } = setup();
      redis.del.mockRejectedValueOnce(new Error('Connection is closed.'));

      await expect(attempts.clear('h')).resolves.toBeUndefined();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection is closed.'),
      );
    });

    it('un rechazo que no es un Error también se avisa', async () => {
      const { attempts, redis, warn } = setup();
      redis.del.mockRejectedValueOnce(NOT_AN_ERROR);

      await attempts.clear('h');

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('error desconocido'),
      );
    });
  });

  it('al apagar la API cierra la conexión', () => {
    const { attempts, redis } = setup();

    attempts.onModuleDestroy();

    expect(redis.disconnect).toHaveBeenCalledOnce();
  });

  it('por defecto deja pasar 5 intentos y la ventana es de 15 minutos', async () => {
    const redis = {
      eval: vi.fn(() => Promise.resolve([6, 300])),
      del: vi.fn(),
      disconnect: vi.fn(),
    };
    const attempts = new RedisSignInAttempts(redis, 'p', vi.fn());

    const verdict = await attempts.register('h');

    expect(verdict.allowed).toBe(false);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'p:h',
      '900',
    );
    redis.eval.mockResolvedValueOnce([5, 300]);
    expect((await attempts.register('h')).allowed).toBe(true);
  });
});
