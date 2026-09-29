import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  PHONE,
  login,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

describe('el guard global', () => {
  it('una ruta protegida sin sesión responde 401 UNAUTHENTICATED', async () => {
    const app = await startWithUser();

    const response = await whoami(app);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Inicia sesión para continuar.',
    });
  });

  it('con la cookie de sesión deja pasar y entrega el usuario a @CurrentUser()', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await whoami(app, cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      phone: PHONE,
      fullName: 'Ana Pérez',
      mustChangePassword: false,
    });
  });

  it('una ruta @Public() no exige sesión', async () => {
    const app = await startWithUser();

    const response = await app.http.get('/probe/open');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ open: true });
  });

  it('una ruta que no existe responde 404, no 401', async () => {
    const app = await startWithUser();

    expect((await app.http.get('/no-existe')).status).toBe(404);
  });
});

describe('lo que better-auth trae y la API no publica', () => {
  it.each([
    ['POST', '/auth/sign-up/email'],
    ['POST', '/auth/sign-in/email'],
    ['POST', '/auth/sign-in/social'],
    ['POST', '/auth/update-user'],
    ['POST', '/auth/change-email'],
    ['POST', '/auth/delete-user'],
    ['POST', '/auth/phone-number/send-otp'],
    ['POST', '/auth/phone-number/verify'],
    ['POST', '/auth/phone-number/reset-password'],
    ['GET', '/auth/list-sessions'],
    ['GET', '/auth/list-accounts'],
    ['GET', '/auth/ok'],
    ['GET', '/auth/expo-authorization-proxy'],
    ['GET', '/auth/sign-in/phone-number'],
    ['GET', '/auth'],
  ])('%s %s responde 404', async (method, path) => {
    const app = await startWithUser();
    const cookie = await login(app);

    const pending =
      method === 'GET' ? app.http.get(path) : app.http.post(path).send({});
    const response = await pending
      .set('Cookie', cookie)
      .set('Origin', APP_ORIGIN);

    expect(response.status).toBe(404);
  });
});
