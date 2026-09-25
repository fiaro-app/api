import { describe, expect, it } from 'vitest';
import { ValidationErrorSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import {
  PASSWORD,
  PHONE,
  THIRTY_DAYS_MS,
  nextIp,
  signIn,
  useAuthApp,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

describe('iniciar sesión con celular y contraseña', () => {
  it('abre una sesión de 30 días en una cookie que JavaScript no puede leer', async () => {
    const app = await startWithUser();

    const response = await signIn(app);

    expect(response.status).toBe(200);
    const [cookie] = response.headers['set-cookie'] as unknown as string[];
    expect(cookie).toMatch(/^fiaro\.session_token=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=2592000');
    expect(response.body.user).toMatchObject({
      phoneNumber: PHONE,
      name: 'Ana Pérez',
      mustChangePassword: false,
    });
  });

  it('guarda la sesión en la base de datos con vencimiento a 30 días', async () => {
    const app = await startWithUser();

    await signIn(app);

    expect(await app.prisma.session.count()).toBe(1);
    const session = await app.prisma.session.findFirstOrThrow();
    const remainingMs = session.expiresAt.getTime() - Date.now();
    expect(Math.abs(remainingMs - THIRTY_DAYS_MS)).toBeLessThan(60_000);
  });

  it('un celular sin cuenta y una contraseña incorrecta responden exactamente lo mismo', async () => {
    const app = await startWithUser();

    const wrongPassword = await signIn(app, {
      password: 'no-es-la-contraseña',
    });
    const unknownPhone = await signIn(app, { phone: '+573109998877' });

    const withoutTimestamp = (body: object) => ({ ...body, timestamp: '' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownPhone.status).toBe(401);
    expect(withoutTimestamp(unknownPhone.body)).toEqual(
      withoutTimestamp(wrongPassword.body),
    );
    expect(wrongPassword.body.code).toBe('INVALID_PHONE_NUMBER_OR_PASSWORD');
    expect(wrongPassword.body.message).toBe(
      'El celular o la contraseña no son correctos.',
    );
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
    expect(await app.prisma.session.count()).toBe(0);
  });

  it.each([
    ['sin el indicativo', '3001234567'],
    ['de otro país', '+12025550123'],
    ['un fijo', '+576012345678'],
    ['con espacios', '+57 300 123 4567'],
    ['de menos dígitos', '+57300123456'],
  ])(
    'rechaza con 400 un celular %s e indica el campo',
    async (_caso, phone) => {
      const app = await startWithUser();

      const response = await signIn(app, { phone });

      expect(response.status).toBe(400);
      expect(ValidationErrorSchema.safeParse(response.body).success).toBe(true);
      expect(response.body.issues[0].path).toEqual(['phoneNumber']);
    },
  );

  it('rechaza con 400 un body sin contraseña', async () => {
    const app = await startWithUser();

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .send({ phoneNumber: PHONE });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.issues[0].path).toEqual(['password']);
  });

  it('rechaza con 400 un campo que la ruta no declara', async () => {
    const app = await startWithUser();

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .send({ phoneNumber: PHONE, password: PASSWORD, admin: true });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('rechaza con 400 un JSON mal formado', async () => {
    const app = await startWithUser();

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .set('Content-Type', 'application/json')
      .send('{no-es-json');

    expect(response.status).toBe(400);
    expect(await app.prisma.session.count()).toBe(0);
  });

  it('con rememberMe en falso la cookie no sobrevive al cierre de la app', async () => {
    const app = await startWithUser();

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .send({ phoneNumber: PHONE, password: PASSWORD, rememberMe: false });

    expect(response.status).toBe(200);
    const cookies = (
      response.headers['set-cookie'] as unknown as string[]
    ).join('\n');
    expect(cookies).toContain('fiaro.session_token=');
    expect(cookies).toContain('fiaro.dont_remember=');
    expect(cookies).not.toMatch(/fiaro\.session_token=[^\n]*Max-Age/);
  });
});
