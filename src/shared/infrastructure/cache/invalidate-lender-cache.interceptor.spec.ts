import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { lastValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { InvalidateLenderCacheInterceptor } from '@/shared/infrastructure/cache/invalidate-lender-cache.interceptor.js';
import { setLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

function setup(method: string, withScope = true) {
  const invalidate = vi.fn(() => Promise.resolve());
  const interceptor = new InvalidateLenderCacheInterceptor({
    invalidate,
  } as unknown as ReadCache);
  const request = { method } as Request;
  if (withScope) {
    setLenderScope(request, {
      membershipId: 'm1',
      lenderId: 'lender-1',
      roles: ['OWNER'],
    });
  }
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { interceptor, invalidate, context };
}

const handler = (body: unknown): CallHandler => ({ handle: () => of(body) });

describe('InvalidateLenderCacheInterceptor', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'después de un %s exitoso invalida el prestamista y responde lo mismo',
    async (method) => {
      const { interceptor, invalidate, context } = setup(method);

      const body = await lastValueFrom(
        interceptor.intercept(context, handler({ ok: 1 })),
      );

      expect(body).toEqual({ ok: 1 });
      expect(invalidate).toHaveBeenCalledExactlyOnceWith('lender-1');
    },
  );

  it.each(['GET', 'QUERY'])('un %s no invalida nada', async (method) => {
    const { interceptor, invalidate, context } = setup(method);

    await lastValueFrom(interceptor.intercept(context, handler(1)));

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('sin prestamista (rutas públicas o de la cuenta) no invalida', async () => {
    const { interceptor, invalidate, context } = setup('POST', false);

    expect(
      await lastValueFrom(interceptor.intercept(context, handler(2))),
    ).toBe(2);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('una escritura que falla no invalida', async () => {
    const { interceptor, invalidate, context } = setup('POST');

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => new Error('x')),
        }),
      ),
    ).rejects.toThrow('x');
    expect(invalidate).not.toHaveBeenCalled();
  });
});
