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

const requestVerification = (app: App, cookie: string) =>
  app.http
    .post('/account/contact-email/request-verification')
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .set('Origin', APP_ORIGIN)
    .send();

const verify = (app: App, cookie: string, code = '000000') =>
  app.http
    .post('/account/contact-email/verify')
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .set('Origin', APP_ORIGIN)
    .send({ code });

describe('verificar el correo de contacto', () => {
  it('con correo de contacto, responde 200 y guarda un código pendiente', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const cookie = await login(app);

    const response = await requestVerification(app, cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: true });
    const pending = await app.prisma.verification.findFirst({
      where: { identifier: { startsWith: 'contact-email-verification:' } },
    });
    expect(pending).not.toBeNull();
  });

  it('sin sesión responde 401', async () => {
    const app = await startEmpty();

    const response = await app.http
      .post('/account/contact-email/request-verification')
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(401);
  });

  it('sin correo de contacto, responde 409 CONTACT_EMAIL_NOT_SET', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
    });
    const cookie = await login(app);

    const response = await requestVerification(app, cookie);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'CONTACT_EMAIL_NOT_SET' });
  });

  it('canjear con un código incorrecto responde 400 y no verifica nada', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const cookie = await login(app);
    await requestVerification(app, cookie);

    const response = await verify(app, cookie, '999999');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'CONTACT_EMAIL_VERIFICATION_CODE_INVALID',
    });
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.contactEmailVerified).toBe(false);
  });

  it('canjear sin haber pedido un código responde 400', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const cookie = await login(app);

    const response = await verify(app, cookie);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'CONTACT_EMAIL_VERIFICATION_CODE_INVALID',
    });
  });

  it('un código que no son 6 dígitos responde 400 VALIDATION_FAILED', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const cookie = await login(app);

    const response = await verify(app, cookie, 'abcdef');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('5 intentos de canje seguidos agotan el cupo: el sexto responde igual sin comprobar el código', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const cookie = await login(app);
    await requestVerification(app, cookie);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await verify(app, cookie, '999999')).status);
    }

    expect(statuses).toEqual([400, 400, 400, 400, 400, 400]);
  });
});
