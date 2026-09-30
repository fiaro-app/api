import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  PASSWORD,
  PHONE,
  login,
  nextIp,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

type App = Awaited<ReturnType<typeof startWithUser>>;

const deactivate = (app: App, cookie: string, password = PASSWORD) =>
  app.http
    .post('/account/deactivate')
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .set('Origin', APP_ORIGIN)
    .send({ password });

describe('desactivar la cuenta', () => {
  it('con la contraseña correcta, responde 200 y cierra la sesión actual', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await deactivate(app, cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: true });
    expect((await whoami(app, cookie)).status).toBe(401);
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.deactivatedAt).not.toBeNull();
  });

  it('cierra todas las sesiones de la persona, no solo la que la pidió', async () => {
    const app = await startWithUser();
    const first = await login(app);
    const second = await login(app);

    await deactivate(app, first);

    expect((await whoami(app, first)).status).toBe(401);
    expect((await whoami(app, second)).status).toBe(401);
    await expect(app.prisma.session.count()).resolves.toBe(0);
  });

  it('después de desactivarla, esa cuenta ya no puede iniciar sesión: responde 403 ACCOUNT_DEACTIVATED', async () => {
    const app = await startWithUser();
    const cookie = await login(app);
    await deactivate(app, cookie);

    const attempt = await signIn(app);

    expect(attempt.status).toBe(403);
    expect(attempt.body).toMatchObject({ code: 'ACCOUNT_DEACTIVATED' });
  });

  it('con la contraseña incorrecta, responde 400 y no desactiva nada', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await deactivate(app, cookie, 'no-es-la-actual');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'INVALID_PASSWORD' });
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.deactivatedAt).toBeNull();
    expect((await signIn(app)).status).toBe(200);
  });

  it('sin sesión responde 401', async () => {
    const app = await startWithUser();

    const response = await app.http
      .post('/account/deactivate')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', APP_ORIGIN)
      .send({ password: PASSWORD });

    expect(response.status).toBe(401);
  });
});
