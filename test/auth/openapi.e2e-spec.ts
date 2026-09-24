import { describe, expect, it } from 'vitest';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';
import { operation, useOpenApi } from '@test/support/openapi.js';

const openApi = useOpenApi();

describe('la documentación de las rutas de autenticación', () => {
  it('describe exactamente las cuatro rutas publicadas y ninguna más', async () => {
    const doc = await openApi();

    const authOperations = Object.entries(doc.paths)
      .filter(([path]) => path.startsWith('/auth'))
      .flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
      )
      .sort();

    expect(authOperations).toEqual([
      'GET /auth/get-session',
      'POST /auth/change-password',
      'POST /auth/sign-in/phone-number',
      'POST /auth/sign-out',
    ]);
  });

  it('las agrupa bajo la etiqueta Autenticación, con su explicación', async () => {
    const doc = await openApi();

    expect(doc.tags).toContainEqual({
      name: API_TAGS.auth.name,
      description: API_TAGS.auth.description,
    });
    for (const [path, method] of [
      ['/auth/sign-in/phone-number', 'post'],
      ['/auth/get-session', 'get'],
      ['/auth/sign-out', 'post'],
      ['/auth/change-password', 'post'],
    ] as const) {
      const documented = operation(doc, path, method);
      expect(documented.tags).toEqual([API_TAGS.auth.name]);
      expect(documented.summary).not.toBe('');
      expect(documented.description).not.toBe('');
    }
  });

  it('declara la cookie de sesión como esquema de seguridad y la exige donde corresponde', async () => {
    const doc = await openApi();

    expect(doc.components.securitySchemes.sessionCookie).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'fiaro.session_token',
    });
    expect(
      operation(doc, '/auth/sign-in/phone-number', 'post').security,
    ).toBeUndefined();
    for (const [path, method] of [
      ['/auth/get-session', 'get'],
      ['/auth/sign-out', 'post'],
      ['/auth/change-password', 'post'],
    ] as const) {
      expect(operation(doc, path, method).security).toEqual([
        { sessionCookie: [] },
      ]);
    }
  });

  it.each([
    ['/auth/sign-in/phone-number', 'post', ['200', '400', '401', '403', '429']],
    ['/auth/get-session', 'get', ['200', '429']],
    ['/auth/sign-out', 'post', ['200', '403', '429']],
    ['/auth/change-password', 'post', ['200', '400', '401', '403', '429']],
  ] as const)('%s documenta las respuestas %j', async (path, method, codes) => {
    const doc = await openApi();

    const documented = operation(doc, path, method);

    expect(Object.keys(documented.responses).sort()).toEqual([...codes]);
    for (const response of Object.values(documented.responses)) {
      expect(response.description).not.toBe('');
    }
  });

  it('documenta las cabeceras Set-Cookie y Retry-After', async () => {
    const doc = await openApi();

    expect(
      operation(doc, '/auth/sign-in/phone-number', 'post').responses['200']
        ?.headers,
    ).toHaveProperty('Set-Cookie');
    expect(
      operation(doc, '/auth/change-password', 'post').responses['200']?.headers,
    ).toHaveProperty('Set-Cookie');
    expect(
      operation(doc, '/auth/get-session', 'get').responses['200']?.headers,
    ).toHaveProperty('Set-Cookie');
    expect(
      operation(doc, '/auth/sign-in/phone-number', 'post').responses['429']
        ?.headers,
    ).toHaveProperty('Retry-After');
  });

  it('describe los cuerpos con las reglas de sus schemas', async () => {
    const doc = await openApi();

    const signIn = operation(doc, '/auth/sign-in/phone-number', 'post')
      .requestBody?.content['application/json'].schema as {
      properties: Record<string, { pattern?: string; maxLength?: number }>;
      required: string[];
      additionalProperties: boolean;
    };
    expect(signIn.required).toEqual(['phoneNumber', 'password']);
    expect(signIn.properties.phoneNumber?.pattern).toBe('^\\+573\\d{9}$');
    expect(signIn.properties.password?.maxLength).toBe(128);
    expect(signIn.additionalProperties).toBe(false);

    const change = operation(doc, '/auth/change-password', 'post').requestBody
      ?.content['application/json'].schema as {
      properties: Record<string, { minLength?: number; maxLength?: number }>;
      required: string[];
    };
    expect(change.required).toEqual(['currentPassword', 'newPassword']);
    expect(change.properties.newPassword).toMatchObject({
      minLength: 8,
      maxLength: 128,
    });
  });

  it('publica los schemas de las respuestas como componentes reutilizables', async () => {
    const doc = await openApi();

    expect(Object.keys(doc.components.schemas)).toEqual(
      expect.arrayContaining([
        'SignInResponse',
        'SessionResponse',
        'SignOutResponse',
        'ChangePasswordResponse',
        'AuthUser',
        'AuthSession',
        'AuthError',
        'ValidationError',
        'RateLimited',
      ]),
    );
  });

  it('explica en la descripción general la sesión, los errores y el rate limit', async () => {
    const doc = await openApi();

    expect(doc.info.description).toContain('UNAUTHENTICATED');
    expect(doc.info.description).toContain('PASSWORD_CHANGE_REQUIRED');
    expect(doc.info.description).toContain('RATE_LIMITED');
  });
});
