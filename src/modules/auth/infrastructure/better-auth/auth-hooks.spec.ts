import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHANGE_PASSWORD_PATH,
  SIGN_IN_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import { APIError } from 'better-auth/api';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { createAuthHooks } from '@/modules/auth/infrastructure/better-auth/auth-hooks.js';

/** Un auditor que solo anota a qué se le avisó. */
function fakeAuditor() {
  return {
    signedIn: vi.fn(),
    signInFailed: vi.fn(),
    signedOut: vi.fn(),
    passwordChanged: vi.fn(),
    passwordChangeFailed: vi.fn(),
  };
}

const auditor = fakeAuditor();
const hooks = createAuthHooks(auditor as unknown as AuthAuditor);

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

describe('hooks.before', () => {
  const credentials = { phoneNumber: '+573001234567', password: 'una-clave-1' };

  it('al iniciar sesión con un celular sin cuenta calcula el hash, para tardar lo mismo que con uno que sí la tiene', async () => {
    const { context, findOne, hash } = signInContext(false, credentials);

    const result = await run(hooks.before, context);

    expect(findOne).toHaveBeenCalledWith({
      model: 'user',
      where: [{ field: 'phoneNumber', value: '+573001234567' }],
    });
    expect(hash).toHaveBeenCalledWith('una-clave-1');
    expect(result).toBeUndefined();
  });

  it('al iniciar sesión con un celular que tiene cuenta deja que better-auth calcule el hash', async () => {
    const { context, hash } = signInContext(true, credentials);

    await run(hooks.before, context);

    expect(hash).not.toHaveBeenCalled();
  });

  it('al cambiar la contraseña obliga a revocar las demás sesiones, aunque el cliente pida lo contrario', async () => {
    const body = {
      currentPassword: 'a',
      newPassword: 'b',
      revokeOtherSessions: false,
    };

    const result = await run(hooks.before, {
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
      const result = await run(hooks.before, {
        path: CHANGE_PASSWORD_PATH,
        body,
      });

      expect(result).toEqual({
        context: { body: { revokeOtherSessions: true } },
      });
    },
  );

  it('no toca las demás rutas', async () => {
    const result = await run(hooks.before, {
      path: '/get-session',
      body: { revokeOtherSessions: false },
    });

    expect(result).toBeUndefined();
  });
});

describe('hooks.after', () => {
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

    await run(hooks.after, context);

    expect(updateUser).toHaveBeenCalledWith('u1', {
      mustChangePassword: false,
    });
  });

  it('y responde con la persona ya sin la marca, no con la que leyó better-auth antes', async () => {
    const { context } = changePasswordContext();

    const result = await run(hooks.after, context);

    expect(result).toEqual({
      token: 'abc',
      user: { id: 'u1', name: 'Ana', mustChangePassword: false },
    });
  });

  it('si better-auth no devolvió un objeto, deja su respuesta como está', async () => {
    const { context, updateUser } = changePasswordContext({
      returned: 'texto',
    });

    const result = await run(hooks.after, context);

    expect(updateUser).toHaveBeenCalledOnce();
    expect(result).toBeUndefined();
  });

  it('si el cambio falló (no hay sesión nueva) no toca nada', async () => {
    const { context, updateUser } = changePasswordContext({
      newSession: null,
    });

    const result = await run(hooks.after, context);

    expect(updateUser).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('no toca las demás rutas', async () => {
    const { context, updateUser } = changePasswordContext();

    const result = await run(hooks.after, {
      ...context,
      path: SIGN_IN_PATH,
    });

    expect(updateUser).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});

describe('authHooks.after: auditoría', () => {
  const origin = { ip: '203.0.113.7', userAgent: 'Fiaro/1.0' };
  const request = new Request('https://api.fiaro.co/auth/x', {
    headers: { 'x-fiaro-client-ip': origin.ip, 'user-agent': origin.userAgent },
  });
  const rejected = (code: string) =>
    new APIError('UNAUTHORIZED', { code, message: 'texto en inglés' });
  const person = {
    id: 'u1',
    phoneNumber: '+573001234567',
    mustChangePassword: true,
  };

  const afterSignIn = (context: object, body: unknown = {}) =>
    run(hooks.after, { path: SIGN_IN_PATH, request, body, context });
  const afterChangePassword = (context: object) =>
    run(hooks.after, {
      path: CHANGE_PASSWORD_PATH,
      request,
      context: { internalAdapter: { updateUser: vi.fn() }, ...context },
    });

  beforeEach(() => {
    for (const notify of Object.values(auditor)) {
      notify.mockClear();
    }
  });

  describe('al iniciar sesión', () => {
    it('avisa de la persona que entró, si entró con una contraseña temporal y desde dónde', async () => {
      await afterSignIn({ newSession: { user: person } });

      expect(auditor.signedIn).toHaveBeenCalledExactlyOnceWith(
        { id: 'u1', phone: '+573001234567' },
        true,
        origin,
      );
      expect(auditor.signInFailed).not.toHaveBeenCalled();
    });

    it('sin la marca de contraseña temporal avisa que no la tenía', async () => {
      await afterSignIn({
        newSession: { user: { id: 'u1', phoneNumber: '+573001234567' } },
      });

      expect(auditor.signedIn).toHaveBeenCalledWith(
        expect.anything(),
        false,
        origin,
      );
    });

    it('si lo rechazaron avisa del celular con el que lo intentaron y del código del error', async () => {
      await afterSignIn(
        { returned: rejected('INVALID_PHONE_NUMBER_OR_PASSWORD') },
        { phoneNumber: '+573109998877', password: 'nunca-se-audita' },
      );

      expect(auditor.signInFailed).toHaveBeenCalledExactlyOnceWith(
        '+573109998877',
        'INVALID_PHONE_NUMBER_OR_PASSWORD',
        origin,
      );
      expect(JSON.stringify(auditor.signInFailed.mock.calls)).not.toContain(
        'nunca-se-audita',
      );
    });

    it('si el cuerpo no trae celular avisa igual, sin él', async () => {
      await afterSignIn({ returned: rejected('VALIDATION_ERROR') }, {});

      expect(auditor.signInFailed).toHaveBeenCalledWith(
        undefined,
        'VALIDATION_ERROR',
        origin,
      );
    });

    it('si no abrió sesión ni fue rechazado no avisa de nada', async () => {
      await afterSignIn({ returned: { algo: true } });

      expect(auditor.signedIn).not.toHaveBeenCalled();
      expect(auditor.signInFailed).not.toHaveBeenCalled();
    });

    it('sin datos de la petición avisa igual, sin IP ni navegador', async () => {
      await run(hooks.after, {
        path: SIGN_IN_PATH,
        context: { newSession: { user: person } },
      });

      expect(auditor.signedIn).toHaveBeenCalledWith(
        expect.anything(),
        true,
        {},
      );
    });
  });

  describe('al cambiar la contraseña', () => {
    it('avisa de quién la cambió', async () => {
      await afterChangePassword({
        newSession: { user: person },
        returned: { user: person },
      });

      expect(auditor.passwordChanged).toHaveBeenCalledExactlyOnceWith(
        { id: 'u1', phone: '+573001234567' },
        origin,
      );
    });

    it('si la rechazaron avisa de quién lo intentó y del código del error', async () => {
      await afterChangePassword({
        session: { user: person },
        returned: rejected('INVALID_PASSWORD'),
      });

      expect(auditor.passwordChangeFailed).toHaveBeenCalledExactlyOnceWith(
        { id: 'u1', phone: '+573001234567' },
        'INVALID_PASSWORD',
        origin,
      );
      expect(auditor.passwordChanged).not.toHaveBeenCalled();
    });

    it('si la rechazaron sin sesión avisa igual, sin la persona', async () => {
      await afterChangePassword({ returned: rejected('UNAUTHORIZED') });

      expect(auditor.passwordChangeFailed).toHaveBeenCalledWith(
        undefined,
        'UNAUTHORIZED',
        origin,
      );
    });

    it('si no hay sesión nueva ni error no avisa de nada', async () => {
      await afterChangePassword({ returned: { algo: true } });

      expect(auditor.passwordChanged).not.toHaveBeenCalled();
      expect(auditor.passwordChangeFailed).not.toHaveBeenCalled();
    });
  });

  it('las demás rutas no se auditan', async () => {
    await run(hooks.after, { path: '/get-session', request, context: {} });

    for (const notify of Object.values(auditor)) {
      expect(notify).not.toHaveBeenCalled();
    }
  });
});
