import { describe, expect, it, vi } from 'vitest';
import {
  CHANGE_PASSWORD_PATH,
  SIGN_IN_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import { authHooks } from '@/modules/auth/infrastructure/better-auth/auth-hooks.js';

/**
 * Los hooks de better-auth son middlewares que se pueden invocar con un contexto a medida: aquí
 * solo lleva lo que cada hook lee.
 */
const run = (hook: unknown, context: object): Promise<unknown> =>
  (hook as (context: object) => Promise<unknown>)(context);

function signInContext(phoneExists: boolean, body: unknown) {
  const findOne = vi.fn(() =>
    Promise.resolve(phoneExists ? { id: 'u1' } : null),
  );
  const hash = vi.fn((password: string) =>
    Promise.resolve(`hash(${password})`),
  );
  return {
    findOne,
    hash,
    context: {
      path: SIGN_IN_PATH,
      body,
      context: { adapter: { findOne }, password: { hash } },
    },
  };
}

describe('authHooks.before', () => {
  const credentials = { phoneNumber: '+573001234567', password: 'una-clave-1' };

  it('al iniciar sesión con un celular sin cuenta calcula el hash, para tardar lo mismo que con uno que sí la tiene', async () => {
    const { context, findOne, hash } = signInContext(false, credentials);

    const result = await run(authHooks.before, context);

    expect(findOne).toHaveBeenCalledWith({
      model: 'user',
      where: [{ field: 'phoneNumber', value: '+573001234567' }],
    });
    expect(hash).toHaveBeenCalledWith('una-clave-1');
    expect(result).toBeUndefined();
  });

  it('al iniciar sesión con un celular que tiene cuenta deja que better-auth calcule el hash', async () => {
    const { context, hash } = signInContext(true, credentials);

    await run(authHooks.before, context);

    expect(hash).not.toHaveBeenCalled();
  });

  it('al cambiar la contraseña obliga a revocar las demás sesiones, aunque el cliente pida lo contrario', async () => {
    const body = {
      currentPassword: 'a',
      newPassword: 'b',
      revokeOtherSessions: false,
    };

    const result = await run(authHooks.before, {
      path: CHANGE_PASSWORD_PATH,
      body,
    });

    expect(result).toEqual({
      context: { body: { ...body, revokeOtherSessions: true } },
    });
  });

  it.each([
    ['sin body', undefined],
    ['un body nulo', null],
    ['un texto', 'hola'],
  ])(
    'al cambiar la contraseña con %s solo pide revocar las demás sesiones: better-auth rechazará el body',
    async (_caso, body) => {
      const result = await run(authHooks.before, {
        path: CHANGE_PASSWORD_PATH,
        body,
      });

      expect(result).toEqual({
        context: { body: { revokeOtherSessions: true } },
      });
    },
  );

  it('no toca las demás rutas', async () => {
    const result = await run(authHooks.before, {
      path: '/get-session',
      body: { revokeOtherSessions: false },
    });

    expect(result).toBeUndefined();
  });
});

describe('authHooks.after', () => {
  const returned = {
    token: 'abc',
    user: { id: 'u1', name: 'Ana', mustChangePassword: true },
  };

  function changePasswordContext(
    overrides: { newSession?: unknown; returned?: unknown } = {},
  ) {
    const updateUser = vi.fn(() => Promise.resolve());
    return {
      updateUser,
      context: {
        path: CHANGE_PASSWORD_PATH,
        context: {
          newSession: { user: { id: 'u1' } },
          returned,
          internalAdapter: { updateUser },
          ...overrides,
        },
      },
    };
  }

  it('al cambiar la contraseña quita la marca de contraseña temporal en la base de datos', async () => {
    const { context, updateUser } = changePasswordContext();

    await run(authHooks.after, context);

    expect(updateUser).toHaveBeenCalledWith('u1', {
      mustChangePassword: false,
    });
  });

  it('y responde con la persona ya sin la marca, no con la que leyó better-auth antes', async () => {
    const { context } = changePasswordContext();

    const result = await run(authHooks.after, context);

    expect(result).toEqual({
      token: 'abc',
      user: { id: 'u1', name: 'Ana', mustChangePassword: false },
    });
  });

  it('si better-auth no devolvió un objeto, deja su respuesta como está', async () => {
    const { context, updateUser } = changePasswordContext({
      returned: 'texto',
    });

    const result = await run(authHooks.after, context);

    expect(updateUser).toHaveBeenCalledOnce();
    expect(result).toBeUndefined();
  });

  it('si el cambio falló (no hay sesión nueva) no toca nada', async () => {
    const { context, updateUser } = changePasswordContext({
      newSession: null,
    });

    const result = await run(authHooks.after, context);

    expect(updateUser).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('no toca las demás rutas', async () => {
    const { context, updateUser } = changePasswordContext();

    const result = await run(authHooks.after, {
      ...context,
      path: SIGN_IN_PATH,
    });

    expect(updateUser).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
