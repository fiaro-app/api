import { describe, expect, it } from 'vitest';
import {
  AuthErrorSchema,
  ValidationErrorSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import { ChangePasswordResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';
import {
  APP_ORIGIN,
  PASSWORD,
  cookieOf,
  login,
  nextIp,
  useAuthApp,
} from '@test/support/auth-flow.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const NEW_PASSWORD = 'la-contraseña-nueva-2';

const changePassword = (
  app: TestApp,
  cookie: string | undefined,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) => {
  const request = app.http
    .post('/auth/change-password')
    .set('X-Forwarded-For', nextIp())
    .set('Origin', APP_ORIGIN);
  for (const [name, value] of Object.entries(headers)) {
    request.set(name, value);
  }
  return (cookie ? request.set('Cookie', cookie) : request).send(body);
};

describe('POST /auth/change-password', () => {
  it('200 cumple ChangePasswordResponse, con token y cookie nuevos', async () => {
    const app = await startWithUser({ mustChangePassword: true });
    const cookie = await login(app);

    const response = await changePassword(app, cookie, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(200);
    const parsed = ChangePasswordResponseSchema.parse(response.body);
    expect(parsed.token).toEqual(expect.any(String));
    expect(cookieOf(response)).toMatch(/^fiaro\.session_token=/);
  });

  it('acepta revokeOtherSessions por compatibilidad con el cliente de better-auth', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await changePassword(app, cookie, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
      revokeOtherSessions: false,
    });

    expect(response.status).toBe(200);
    expect(await app.prisma.session.count()).toBe(1);
  });

  it('400 con la contraseña nueva demasiado corta cumple ValidationError', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await changePassword(app, cookie, {
      currentPassword: PASSWORD,
      newPassword: '1234567',
    });

    expect(response.status).toBe(400);
    expect(ValidationErrorSchema.parse(response.body).issues[0]?.path).toEqual([
      'newPassword',
    ]);
  });

  it('400 con la contraseña actual incorrecta cumple AuthError con INVALID_PASSWORD', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await changePassword(app, cookie, {
      currentPassword: 'no-es-la-actual',
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(400);
    expect(AuthErrorSchema.parse(response.body).code).toBe('INVALID_PASSWORD');
  });

  it('401 sin sesión cumple AuthError con UNAUTHORIZED', async () => {
    const app = await startWithUser();

    const response = await changePassword(app, undefined, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(401);
    expect(AuthErrorSchema.parse(response.body).code).toBe('UNAUTHORIZED');
  });

  it('403 con un origen que no es de confianza cumple AuthError', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await changePassword(
      app,
      cookie,
      { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      { Origin: 'https://sitio-ajeno.example' },
    );

    expect(response.status).toBe(403);
    expect(AuthErrorSchema.safeParse(response.body).success).toBe(true);
  });
});
