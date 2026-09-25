import { describe, expect, it } from 'vitest';
import { MemorySignInAttempts } from '@/modules/auth/infrastructure/lockout/memory-sign-in-attempts.js';

const SUBJECT = 'huella-del-celular';

function setup(maxAttempts = 3, windowSeconds = 60) {
  let clock = 1_000_000;
  const attempts = new MemorySignInAttempts(
    () => clock,
    maxAttempts,
    windowSeconds,
  );
  return {
    attempts,
    advance: (seconds: number) => {
      clock += seconds * 1_000;
    },
  };
}

describe('MemorySignInAttempts', () => {
  it('deja pasar los intentos que caben y bloquea el siguiente', async () => {
    const { attempts } = setup(3);

    const verdicts = [];
    for (let i = 0; i < 4; i += 1) {
      verdicts.push(await attempts.register(SUBJECT));
    }

    expect(verdicts.map((verdict) => verdict.allowed)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(verdicts[0]?.retryAfterSeconds).toBe(0);
  });

  it('dice cuántos segundos faltan para que termine la ventana, sin renovarla con los intentos bloqueados', async () => {
    const { attempts, advance } = setup(1, 60);
    await attempts.register(SUBJECT);

    advance(10);
    const first = await attempts.register(SUBJECT);
    advance(20);
    const second = await attempts.register(SUBJECT);

    expect(first).toEqual({ allowed: false, retryAfterSeconds: 50 });
    expect(second).toEqual({ allowed: false, retryAfterSeconds: 30 });
  });

  it('redondea hacia arriba los segundos que faltan', async () => {
    const { attempts, advance } = setup(1, 60);
    await attempts.register(SUBJECT);

    advance(59.5);
    const verdict = await attempts.register(SUBJECT);

    expect(verdict.retryAfterSeconds).toBe(1);
  });

  it('al terminar la ventana el celular vuelve a tener todos sus intentos', async () => {
    const { attempts, advance } = setup(1, 60);
    await attempts.register(SUBJECT);
    expect((await attempts.register(SUBJECT)).allowed).toBe(false);

    advance(60);

    expect((await attempts.register(SUBJECT)).allowed).toBe(true);
  });

  it('cada celular cuenta por su lado', async () => {
    const { attempts } = setup(1);
    await attempts.register('uno');

    expect((await attempts.register('uno')).allowed).toBe(false);
    expect((await attempts.register('otro')).allowed).toBe(true);
  });

  it('clear reinicia los intentos del celular', async () => {
    const { attempts } = setup(1);
    await attempts.register(SUBJECT);
    expect((await attempts.register(SUBJECT)).allowed).toBe(false);

    await attempts.clear(SUBJECT);

    expect((await attempts.register(SUBJECT)).allowed).toBe(true);
  });

  it('clear de un celular sin intentos no falla', async () => {
    const { attempts } = setup();

    await expect(attempts.clear('desconocido')).resolves.toBeUndefined();
  });

  it('con muchos celulares barre los vencidos y conserva los vigentes', async () => {
    const { attempts, advance } = setup(1, 60);
    for (let i = 0; i < 600; i += 1) {
      await attempts.register(`viejo-${String(i)}`);
    }
    advance(30);
    for (let i = 0; i < 600; i += 1) {
      await attempts.register(`reciente-${String(i)}`);
    }
    advance(40);

    await attempts.register('nuevo');

    expect((await attempts.register('reciente-0')).allowed).toBe(false);
    expect((await attempts.register('viejo-0')).allowed).toBe(true);
  });

  it('por defecto deja pasar 5 intentos por ventana y usa el reloj del sistema', async () => {
    const attempts = new MemorySignInAttempts();

    const verdicts = [];
    for (let i = 0; i < 6; i += 1) {
      verdicts.push(await attempts.register(SUBJECT));
    }

    expect(verdicts.map((verdict) => verdict.allowed)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
    expect(verdicts[5]?.retryAfterSeconds).toBeGreaterThan(890);
    expect(verdicts[5]?.retryAfterSeconds).toBeLessThanOrEqual(900);
  });
});
