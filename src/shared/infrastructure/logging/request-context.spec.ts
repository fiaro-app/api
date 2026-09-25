import { describe, expect, it } from 'vitest';
import {
  currentRequestContext,
  runWithRequestContext,
} from '@/shared/infrastructure/logging/request-context.js';

describe('contexto de la petición', () => {
  it('fuera de una petición no hay contexto', () => {
    expect(currentRequestContext()).toBeUndefined();
  });

  it('dentro se ve el contexto, también después de un await', async () => {
    await runWithRequestContext({ requestId: 'abc' }, async () => {
      await Promise.resolve();

      expect(currentRequestContext()).toEqual({ requestId: 'abc' });
    });
  });

  it('devuelve lo que devuelve la función', () => {
    expect(runWithRequestContext({ requestId: 'abc' }, () => 42)).toBe(42);
  });

  it('dos peticiones a la vez no mezclan su contexto', async () => {
    const seen: (string | undefined)[] = [];
    const attend = (requestId: string, delayMs: number) =>
      runWithRequestContext({ requestId }, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        seen.push(currentRequestContext()?.requestId);
      });

    await Promise.all([attend('lenta', 20), attend('rapida', 1)]);

    expect(seen).toEqual(['rapida', 'lenta']);
  });

  it('al terminar la petición el contexto deja de existir', () => {
    runWithRequestContext({ requestId: 'abc' }, () => undefined);

    expect(currentRequestContext()).toBeUndefined();
  });
});
