import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  PASSWORD,
  PHONE,
  login,
  nextIp,
  useAuthApp,
} from '@test/support/auth-flow.js';

const { startEmpty } = useAuthApp();

type App = Awaited<ReturnType<typeof startEmpty>>;

const updateProfile = (
  app: App,
  cookie: string,
  body: Record<string, unknown>,
) =>
  app.http
    .patch('/account/profile')
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .set('Origin', APP_ORIGIN)
    .send(body);

describe('actualizar el perfil', () => {
  it('con un nombre nuevo, lo cambia y no toca el correo ni su verificación', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const cookie = await login(app);

    const response = await updateProfile(app, cookie, {
      fullName: 'Ana Pérez Gómez',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      fullName: 'Ana Pérez Gómez',
      contactEmail: 'ana@example.com',
      contactEmailVerified: false,
    });
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.fullName).toBe('Ana Pérez Gómez');
  });

  it('con un correo de contacto nuevo, lo cambia, quita la verificación y guarda un código pendiente', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'vieja@example.com',
    });
    const cookie = await login(app);

    const response = await updateProfile(app, cookie, {
      contactEmail: 'nueva@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      fullName: 'Ana Pérez',
      contactEmail: 'nueva@example.com',
      contactEmailVerified: false,
    });
    const pending = await app.prisma.verification.findFirst({
      where: { identifier: { startsWith: 'contact-email-verification:' } },
    });
    expect(pending).not.toBeNull();
  });

  it('quitando el correo de contacto (null), lo borra y no deja un código pendiente', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const cookie = await login(app);

    const response = await updateProfile(app, cookie, { contactEmail: null });

    expect(response.status).toBe(200);
    expect(response.body.contactEmail).toBeNull();
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.contactEmail).toBeNull();
    await expect(app.prisma.verification.findFirst()).resolves.toBeNull();
  });

  it('un cuerpo vacío responde 400 VALIDATION_FAILED', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
    });
    const cookie = await login(app);

    const response = await updateProfile(app, cookie, {});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('un correo que no cumple el formato responde 400 VALIDATION_FAILED', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
    });
    const cookie = await login(app);

    const response = await updateProfile(app, cookie, {
      contactEmail: 'no-es-un-correo',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('sin sesión responde 401', async () => {
    const app = await startEmpty();

    const response = await app.http
      .patch('/account/profile')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', APP_ORIGIN)
      .send({ fullName: 'Ana' });

    expect(response.status).toBe(401);
  });
});
