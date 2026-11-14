import { describe, expect, it } from 'vitest';
import {
  PASSWORD,
  PHONE,
  nextIp,
  useAuthApp,
} from '@test/support/auth-flow.js';
import { ContactEmailAlreadyRegisteredError } from '@/modules/auth/domain/errors/contact-email-already-registered.error.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const EMAIL = 'ana@example.com';

/** El cuerpo del error sin lo que cambia en cada petición. */
const stable = (body: object) => ({
  ...body,
  requestId: undefined,
  timestamp: undefined,
});

const signInWith = (
  app: TestApp,
  identifier: string,
  password = PASSWORD,
  ip = nextIp(),
) =>
  app.http
    .post('/auth/sign-in')
    .set('X-Forwarded-For', ip)
    .send({ identifier, password });

async function startWithEmail(verified: boolean): Promise<TestApp> {
  const app = await startWithUser();
  await app.prisma.user.update({
    where: { phone: PHONE },
    data: { contactEmail: EMAIL, contactEmailVerified: verified },
  });
  return app;
}

describe('POST /auth/sign-in: celular o correo', () => {
  it('con el celular abre sesión igual que la ruta de celular', async () => {
    const app = await startWithUser();

    const response = await signInWith(app, PHONE);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ phoneNumber: PHONE });
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('con el correo verificado abre sesión, sin distinguir mayúsculas', async () => {
    const app = await startWithEmail(true);

    const response = await signInWith(app, 'ANA@Example.com');

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ phoneNumber: PHONE });
  });

  it('un correo sin verificar responde igual que una contraseña incorrecta', async () => {
    const app = await startWithEmail(false);

    const unverified = await signInWith(app, EMAIL);
    const unknown = await signInWith(app, 'nadie@example.com');

    expect(unverified.status).toBe(401);
    expect(stable(unverified.body)).toEqual(stable(unknown.body));
    expect(unverified.headers['set-cookie']).toBeUndefined();
  });

  it('un correo desconocido y una contraseña incorrecta responden lo mismo', async () => {
    const app = await startWithEmail(true);

    const unknown = await signInWith(app, 'nadie@example.com');
    const wrong = await signInWith(app, EMAIL, 'incorrecta-1');

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(stable(unknown.body)).toEqual(stable(wrong.body));
  });

  it('un correo desconocido también se bloquea tras 5 intentos, como uno con cuenta', async () => {
    const app = await startWithEmail(true);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await signInWith(app, 'nadie@example.com')).status);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('rechaza una identidad que no es celular ni correo', async () => {
    const app = await startWithUser();

    const response = await signInWith(app, 'hola');

    expect(response.status).toBe(400);
  });

  it('el correo de contacto es único sin distinguir mayúsculas', async () => {
    const app = await startWithEmail(false);

    await expect(
      app.createUser({
        phone: '+573001234999',
        fullName: 'Otra Persona',
        password: PASSWORD,
        contactEmail: 'ANA@example.com',
      }),
    ).rejects.toBeInstanceOf(ContactEmailAlreadyRegisteredError);
  });
});
