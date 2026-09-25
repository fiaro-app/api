import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  PASSWORD,
  PHONE,
  cookieOf,
  login,
  nextIp,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

describe('contraseña temporal', () => {
  it('la sesión abre, pero las rutas protegidas responden 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const app = await startWithUser({ mustChangePassword: true });
    const cookie = await login(app);

    const protectedRoute = await whoami(app, cookie);
    const session = await app.http
      .get('/auth/get-session')
      .set('Cookie', cookie);

    expect(protectedRoute.status).toBe(403);
    expect(protectedRoute.body).toMatchObject({
      statusCode: 403,
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Debes cambiar tu contraseña temporal antes de continuar.',
    });
    expect(session.body.user.mustChangePassword).toBe(true);
  });

  it('cambiarla quita la marca, revoca las demás sesiones y entrega una sesión nueva', async () => {
    const app = await startWithUser({ mustChangePassword: true });
    const first = await login(app);
    const second = await login(app);

    const change = await app.http
      .post('/auth/change-password')
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', first)
      .set('Origin', APP_ORIGIN)
      .send({
        currentPassword: PASSWORD,
        newPassword: 'la-contraseña-nueva-2',
      });

    expect(change.status).toBe(200);
    expect(change.body.user.mustChangePassword).toBe(false);
    const fresh = cookieOf(change);
    expect((await whoami(app, fresh)).status).toBe(200);
    expect((await whoami(app, first)).status).toBe(401);
    expect((await whoami(app, second)).status).toBe(401);
    expect(await app.prisma.session.count()).toBe(1);
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.mustChangePassword).toBe(false);
  });

  it('con la contraseña temporal ya no se puede iniciar sesión; con la nueva, sí', async () => {
    const app = await startWithUser({ mustChangePassword: true });
    const cookie = await login(app);
    await app.http
      .post('/auth/change-password')
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', cookie)
      .set('Origin', APP_ORIGIN)
      .send({
        currentPassword: PASSWORD,
        newPassword: 'la-contraseña-nueva-2',
      });

    const withOld = await signIn(app);
    const withNew = await signIn(app, { password: 'la-contraseña-nueva-2' });

    expect(withOld.status).toBe(401);
    expect(withNew.status).toBe(200);
    expect((await whoami(app, cookieOf(withNew))).status).toBe(200);
  });

  it('rechaza con 400 la contraseña actual incorrecta y no cambia nada', async () => {
    const app = await startWithUser({ mustChangePassword: true });
    const cookie = await login(app);

    const change = await app.http
      .post('/auth/change-password')
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', cookie)
      .set('Origin', APP_ORIGIN)
      .send({
        currentPassword: 'no-es-la-actual',
        newPassword: 'la-contraseña-nueva-2',
      });

    expect(change.status).toBe(400);
    expect(change.body).toMatchObject({
      code: 'INVALID_PASSWORD',
      message: 'La contraseña no es correcta.',
    });
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.mustChangePassword).toBe(true);
    expect((await signIn(app)).status).toBe(200);
  });

  it.each([
    ['corta', '1234567'],
    ['larga', 'a'.repeat(129)],
  ])(
    'rechaza con 400 una contraseña nueva demasiado %s e indica el campo',
    async (_caso, newPassword) => {
      const app = await startWithUser({ mustChangePassword: true });
      const cookie = await login(app);

      const change = await app.http
        .post('/auth/change-password')
        .set('X-Forwarded-For', nextIp())
        .set('Cookie', cookie)
        .set('Origin', APP_ORIGIN)
        .send({ currentPassword: PASSWORD, newPassword });

      expect(change.status).toBe(400);
      expect(change.body.code).toBe('VALIDATION_FAILED');
      expect(change.body.issues[0].path).toEqual(['newPassword']);
      expect(change.body.issues[0].message).toMatch(
        /^La longitud (mínima|máxima) es \d+\.$/,
      );
    },
  );

  it('cambiar la contraseña de una cuenta normal también revoca las demás sesiones', async () => {
    const app = await startWithUser();
    const first = await login(app);
    const second = await login(app);

    const change = await app.http
      .post('/auth/change-password')
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', first)
      .set('Origin', APP_ORIGIN)
      .send({
        currentPassword: PASSWORD,
        newPassword: 'la-contraseña-nueva-2',
      });

    expect(change.status).toBe(200);
    expect((await whoami(app, second)).status).toBe(401);
  });

  it('limita a 5 por minuto los intentos de cambiar la contraseña desde una IP', async () => {
    const app = await startWithUser();
    const cookie = await login(app);
    const ip = nextIp();
    const attempt = async () =>
      (
        await app.http
          .post('/auth/change-password')
          .set('X-Forwarded-For', ip)
          .set('Cookie', cookie)
          .set('Origin', APP_ORIGIN)
          .send({
            currentPassword: 'no-es-la-actual',
            newPassword: 'la-contraseña-nueva-2',
          })
      ).status;

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(await attempt());
    }

    expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
  });
});
