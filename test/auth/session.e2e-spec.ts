import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  PHONE,
  THIRTY_DAYS_MS,
  login,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

describe('la sesión', () => {
  it('get-session devuelve el usuario con la cookie y null sin ella', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const withCookie = await app.http
      .get('/auth/get-session')
      .set('Cookie', cookie);
    const withoutCookie = await app.http.get('/auth/get-session');

    expect(withCookie.status).toBe(200);
    expect(withCookie.body.user.phoneNumber).toBe(PHONE);
    expect(withoutCookie.status).toBe(200);
    expect(withoutCookie.body).toBeNull();
  });

  it('cerrar sesión revoca la sesión: la cookie deja de servir y la fila desaparece', async () => {
    const app = await startWithUser();
    const cookie = await login(app);
    expect((await whoami(app, cookie)).status).toBe(200);

    const signOut = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .set('Origin', APP_ORIGIN);

    expect(signOut.status).toBe(200);
    expect((await whoami(app, cookie)).status).toBe(401);
    expect(await app.prisma.session.count()).toBe(0);
  });

  it('borrar la sesión en la base de datos la revoca en la siguiente petición', async () => {
    const app = await startWithUser();
    const cookie = await login(app);
    expect((await whoami(app, cookie)).status).toBe(200);

    await app.prisma.session.deleteMany();

    expect((await whoami(app, cookie)).status).toBe(401);
  });

  it('una sesión vencida no sirve', async () => {
    const app = await startWithUser();
    const cookie = await login(app);
    await app.prisma.session.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect((await whoami(app, cookie)).status).toBe(401);
  });

  it('una cookie manipulada no sirve', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const forged = cookie.replace(/=(.)/, '=X$1');

    expect((await whoami(app, forged)).status).toBe(401);
  });

  it('get-session renueva la sesión y responde con la cookie nueva; el guard no la renueva', async () => {
    const app = await startWithUser();
    const cookie = await login(app);
    const staleExpiry = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
    await app.prisma.session.updateMany({ data: { expiresAt: staleExpiry } });

    await whoami(app, cookie);
    const afterGuard = await app.prisma.session.findFirstOrThrow();
    expect(afterGuard.expiresAt.getTime()).toBe(staleExpiry.getTime());

    const refresh = await app.http
      .get('/auth/get-session')
      .set('Cookie', cookie);
    const afterRefresh = await app.prisma.session.findFirstOrThrow();
    expect(
      Math.abs(afterRefresh.expiresAt.getTime() - Date.now() - THIRTY_DAYS_MS),
    ).toBeLessThan(60_000);
    expect(refresh.headers['set-cookie']).toBeDefined();
  });
});
