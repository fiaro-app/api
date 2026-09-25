import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  cookieOf,
  login,
  nextIp,
  PASSWORD,
  PHONE,
  signIn,
  useAuthApp,
} from '@test/support/auth-flow.js';
import { captureLogs } from '@test/support/log-capture.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const HASH = /^[0-9a-f]{32}$/;

async function startAuditing(mustChangePassword = false) {
  const logs = captureLogs();
  const app = await startWithUser({
    mustChangePassword,
    env: { LOG_LEVEL: 'info' },
    logDestination: logs.destination,
  });
  const audit = () => logs.entries().filter((entry) => entry.audit === true);
  const userId = async () =>
    (await app.prisma.user.findUniqueOrThrow({ where: { phone: PHONE } })).id;
  return { app, logs, audit, userId };
}

const signOut = (app: TestApp, cookie: string) =>
  app.http
    .post('/auth/sign-out')
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .set('Origin', APP_ORIGIN);

const changePassword = (
  app: TestApp,
  cookie: string,
  currentPassword: string,
) =>
  app.http
    .post('/auth/change-password')
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .set('Origin', APP_ORIGIN)
    .send({ currentPassword, newPassword: 'la-contraseña-nueva-2' });

describe('auditoría de la autenticación', () => {
  it('un inicio de sesión deja un evento con quién, desde dónde y la petición, con el celular enmascarado', async () => {
    const { app, audit, userId } = await startAuditing();
    const ip = nextIp();

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', ip)
      .set('User-Agent', 'Fiaro-Mobile/1.2 (Android 14)')
      .send({ phoneNumber: PHONE, password: PASSWORD });

    expect(audit()).toHaveLength(1);
    expect(audit()[0]).toMatchObject({
      level: 'info',
      service: 'fiaro-api',
      context: 'Audit',
      msg: 'auth.sign_in.succeeded',
      event: 'auth.sign_in.succeeded',
      outcome: 'SUCCESS',
      userId: await userId(),
      phone: { last4: '4567', hash: expect.stringMatching(HASH) },
      details: { mustChangePassword: false },
      requestId: response.headers['x-request-id'],
      ip,
      userAgent: 'Fiaro-Mobile/1.2 (Android 14)',
    });
    expect(Date.parse(String(audit()[0]?.occurredAt))).not.toBeNaN();
  });

  it('con una contraseña temporal el evento lo dice', async () => {
    const { app, audit } = await startAuditing(true);

    await signIn(app);

    expect(audit()[0]).toMatchObject({
      event: 'auth.sign_in.succeeded',
      details: { mustChangePassword: true },
    });
  });

  it('una contraseña incorrecta deja un evento de rechazo con el motivo, sin persona', async () => {
    const { app, audit, logs } = await startAuditing();

    await signIn(app, { password: 'no-es-la-contraseña' });

    expect(audit()).toHaveLength(1);
    expect(audit()[0]).toMatchObject({
      event: 'auth.sign_in.failed',
      outcome: 'FAILURE',
      reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
      phone: { last4: '4567', hash: expect.stringMatching(HASH) },
    });
    expect(audit()[0]).not.toHaveProperty('userId');
    expect(logs.text()).not.toContain('no-es-la-contraseña');
  });

  it('un celular sin cuenta deja el mismo evento, con su propia huella', async () => {
    const { app, audit } = await startAuditing();

    await signIn(app);
    await signIn(app, { phone: '+573109998877' });

    const [known, unknown] = audit();
    expect(unknown).toMatchObject({
      event: 'auth.sign_in.failed',
      reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
      phone: { last4: '8877' },
    });
    expect(unknown?.phone).not.toEqual(known?.phone);
  });

  it('el mismo celular da siempre la misma huella: así se sigue a la persona', async () => {
    const { app, audit } = await startAuditing();

    await signIn(app);
    await signIn(app, { password: 'no-es-la-contraseña' });

    const [ok, failed] = audit();
    expect(failed?.phone).toEqual(ok?.phone);
  });

  it('cerrar sesión deja un evento con quién era', async () => {
    const { app, audit, userId } = await startAuditing();
    const cookie = await login(app);

    const response = await signOut(app, cookie);

    expect(response.status).toBe(200);
    expect(audit().map((entry) => entry.event)).toEqual([
      'auth.sign_in.succeeded',
      'auth.sign_out',
    ]);
    expect(audit()[1]).toMatchObject({
      outcome: 'SUCCESS',
      userId: await userId(),
      requestId: response.headers['x-request-id'],
    });
  });

  it('cerrar una sesión que ya no existe no deja evento', async () => {
    const { app, audit } = await startAuditing();
    const cookie = await login(app);
    await signOut(app, cookie);

    await signOut(app, cookie);

    expect(
      audit().filter((entry) => entry.event === 'auth.sign_out'),
    ).toHaveLength(1);
  });

  it('cambiar la contraseña deja un evento, y las sesiones que revoca no cuentan como cerrar sesión', async () => {
    const { app, audit, userId } = await startAuditing();
    const cookie = await login(app);
    await login(app);

    const response = await changePassword(app, cookie, PASSWORD);

    expect(response.status).toBe(200);
    const events = audit().map((entry) => entry.event);
    expect(events).toContain('auth.password.changed');
    expect(events).not.toContain('auth.sign_out');
    expect(
      audit().find((entry) => entry.event === 'auth.password.changed'),
    ).toMatchObject({ outcome: 'SUCCESS', userId: await userId() });
  });

  it('una contraseña actual incorrecta deja un evento de rechazo con quién lo intentó', async () => {
    const { app, audit, userId, logs } = await startAuditing();
    const cookie = await login(app);

    const response = await changePassword(app, cookie, 'no-es-la-actual');

    expect(response.status).toBe(400);
    expect(audit().at(-1)).toMatchObject({
      event: 'auth.password.change_failed',
      outcome: 'FAILURE',
      reason: 'INVALID_PASSWORD',
      userId: await userId(),
    });
    expect(logs.text()).not.toContain('no-es-la-actual');
  });

  it('un cuerpo que ni llega a better-auth (400 del contrato) no deja evento', async () => {
    const { app, audit } = await startAuditing();

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .send({ phoneNumber: '3001234567', password: PASSWORD });

    expect(response.status).toBe(400);
    expect(audit()).toEqual([]);
  });

  it('ningún log lleva el celular completo, la contraseña ni la cookie de sesión', async () => {
    const { app, logs } = await startAuditing();
    const response = await signIn(app);
    const cookie = cookieOf(response);
    await changePassword(app, cookie, PASSWORD);
    await signOut(app, cookie);

    const text = logs.text();
    expect(text).not.toContain(PHONE);
    expect(text).not.toContain('3001234567');
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain('la-contraseña-nueva-2');
    expect(text).not.toContain(cookie.split('=')[1]?.split(';')[0] ?? 'x');
  });
});
