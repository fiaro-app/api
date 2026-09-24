import { describe, expect, it, vi } from 'vitest';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BetterAuthSessionResolver } from '@/modules/auth/infrastructure/better-auth/better-auth-session-resolver.js';

const RESULT = {
  session: { id: 'session-1' },
  user: {
    id: 'user-1',
    name: 'Ana Pérez',
    phoneNumber: '+573001234567',
    mustChangePassword: true,
  },
};

function setup(result: unknown) {
  const getSession = vi.fn(() => Promise.resolve(result));
  const resolver = new BetterAuthSessionResolver({
    api: { getSession },
  } as unknown as Auth);
  return { resolver, getSession };
}

describe('BetterAuthSessionResolver', () => {
  it('convierte la sesión de better-auth en la del puerto', async () => {
    const { resolver } = setup(RESULT);

    await expect(resolver.resolve({})).resolves.toEqual({
      id: 'session-1',
      user: {
        id: 'user-1',
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        mustChangePassword: true,
      },
    });
  });

  it('devuelve null cuando no hay sesión vigente', async () => {
    const { resolver } = setup(null);

    await expect(
      resolver.resolve({ cookie: 'fiaro.session_token=x' }),
    ).resolves.toBeNull();
  });

  it('pasa la cookie a better-auth y le pide no renovar la sesión', async () => {
    const { resolver, getSession } = setup(RESULT);

    await resolver.resolve({
      cookie: 'fiaro.session_token=abc',
      'user-agent': 'expo',
    });

    const call = (
      getSession.mock.calls[0] as unknown as [
        { headers: Headers; query: unknown },
      ]
    )[0];
    expect(call.headers.get('cookie')).toBe('fiaro.session_token=abc');
    expect(call.headers.get('user-agent')).toBe('expo');
    expect(call.query).toEqual({ disableRefresh: true });
  });

  it.each([
    ['nulo', null],
    ['vacío', ''],
    ['ausente', undefined],
  ])(
    'falla en voz alta si el celular de la persona está %s: la base de datos lo exige',
    async (_caso, phoneNumber) => {
      const { resolver } = setup({
        ...RESULT,
        user: { ...RESULT.user, phoneNumber },
      });

      await expect(resolver.resolve({})).rejects.toThrow(
        'La persona user-1 no tiene celular.',
      );
    },
  );

  it('una contraseña que no es temporal no exige cambio', async () => {
    const { resolver } = setup({
      ...RESULT,
      user: { ...RESULT.user, mustChangePassword: null },
    });

    const session = await resolver.resolve({});

    expect(session?.user.mustChangePassword).toBe(false);
  });
});
