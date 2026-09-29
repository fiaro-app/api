import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  PASSWORD,
  PHONE,
  nextIp,
  signIn,
  useAuthApp,
} from '@test/support/auth-flow.js';

const { startEmpty } = useAuthApp();

const request = (app: Awaited<ReturnType<typeof startEmpty>>, phone = PHONE) =>
  app.http
    .post('/auth/request-password-reset')
    .set('X-Forwarded-For', nextIp())
    .send({ phoneNumber: phone });

const reset = (
  app: Awaited<ReturnType<typeof startEmpty>>,
  body: { phoneNumber?: string; code?: string; newPassword?: string },
) =>
  app.http
    .post('/auth/reset-password')
    .set('X-Forwarded-For', nextIp())
    .set('Origin', APP_ORIGIN)
    .send({
      phoneNumber: body.phoneNumber ?? PHONE,
      code: body.code ?? '000000',
      newPassword: body.newPassword ?? 'la-contraseña-nueva-2',
    });

describe('recuperar la contraseña por correo', () => {
  it('con cuenta y correo de contacto, responde 200 y guarda un código pendiente', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });

    const response = await request(app);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: true });
    const pending = await app.prisma.verification.findFirst({
      where: { identifier: { startsWith: 'password-reset:' } },
    });
    expect(pending).not.toBeNull();
    expect(pending?.value).not.toBe('000000');
  });

  it('con un celular sin cuenta, responde lo mismo y no guarda nada: no revela si tiene cuenta', async () => {
    const app = await startEmpty();

    const response = await request(app, '+573109998877');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: true });
    await expect(app.prisma.verification.findFirst()).resolves.toBeNull();
  });

  it('con cuenta pero sin correo de contacto, responde lo mismo y no guarda nada', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
    });

    const response = await request(app);

    expect(response.status).toBe(200);
    await expect(app.prisma.verification.findFirst()).resolves.toBeNull();
  });

  it('canjear sin haber pedido un código responde 400 PASSWORD_RESET_CODE_INVALID', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });

    const response = await reset(app, {});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'PASSWORD_RESET_CODE_INVALID',
    });
    expect((await signIn(app)).status).toBe(200);
  });

  it('canjear con un código incorrecto responde 400 y no cambia la contraseña', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    await request(app);

    const response = await reset(app, { code: '999999' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'PASSWORD_RESET_CODE_INVALID',
    });
    expect((await signIn(app)).status).toBe(200);
  });

  it('canjear con un celular sin cuenta responde lo mismo que un código incorrecto', async () => {
    const app = await startEmpty();

    const response = await reset(app, { phoneNumber: '+573109998877' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'PASSWORD_RESET_CODE_INVALID',
    });
  });

  it('un código que no son 6 dígitos responde 400 VALIDATION_FAILED', async () => {
    const app = await startEmpty();

    const response = await reset(app, { code: 'abcdef' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.issues[0].path).toEqual(['code']);
  });

  it('pasados los 3 pedidos por hora para ese celular, ya no genera un código nuevo, aunque la respuesta siga siendo 200', async () => {
    const app = await startEmpty();
    await app.createUser({
      phone: PHONE,
      fullName: 'Ana Pérez',
      password: PASSWORD,
      contactEmail: 'ana@example.com',
    });
    const where = { identifier: { startsWith: 'password-reset:' } };

    await request(app);
    await request(app);
    await request(app);
    const beforeFourth = await app.prisma.verification.findFirst({ where });
    const fourth = await request(app);
    const afterFourth = await app.prisma.verification.findFirst({ where });

    expect(fourth.status).toBe(200);
    expect(afterFourth?.value).toBe(beforeFourth?.value);
  });
});
