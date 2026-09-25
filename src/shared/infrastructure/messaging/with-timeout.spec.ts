import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve lo que resuelve la promesa si llega a tiempo', async () => {
    await expect(withTimeout(Promise.resolve(42), 1_000)).resolves.toBe(42);
  });

  it('deja pasar el error de la promesa', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('falló')), 1_000),
    ).rejects.toThrow('falló');
  });

  it('rechaza si la promesa no termina a tiempo', async () => {
    vi.useFakeTimers();
    const never = new Promise<never>(() => undefined);

    const result = withTimeout(never, 3_000);
    const assertion = expect(result).rejects.toThrow(
      'sin respuesta en 3000 ms',
    );
    await vi.advanceTimersByTimeAsync(3_000);

    await assertion;
  });

  it('no deja un temporizador pendiente cuando la promesa termina a tiempo', async () => {
    vi.useFakeTimers();

    await withTimeout(Promise.resolve('listo'), 60_000);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('si la promesa falla después de agotarse el tiempo, ese error no queda sin atender', async () => {
    vi.useFakeTimers();
    let fail: (error: Error) => void = () => undefined;
    const late = new Promise<never>((_resolve, reject) => {
      fail = reject;
    });

    const result = withTimeout(late, 1_000);
    const assertion = expect(result).rejects.toThrow('sin respuesta');
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    fail(new Error('tarde'));

    await vi.advanceTimersByTimeAsync(0);
  });
});
