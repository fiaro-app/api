import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  PASSWORD,
  PHONE,
  login,
  nextIp,
  useAuthApp,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

describe('origen de las peticiones con cookie', () => {
  it('rechaza con 403 un origen que no es de confianza', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .set('Origin', 'https://sitio-ajeno.example');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('INVALID_ORIGIN');
    expect(await app.prisma.session.count()).toBe(1);
  });

  it('acepta el origen del panel web configurado en CORS_ORIGINS', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .set('Origin', APP_ORIGIN);

    expect(response.status).toBe(200);
  });

  it('acepta la app nativa que se identifica con expo-origin y su esquema', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .set('expo-origin', 'fiaro://');

    expect(response.status).toBe(200);
  });

  it('rechaza expo-origin con un esquema que no está configurado', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .set('expo-origin', 'otra-app://');

    expect(response.status).toBe(403);
  });

  it('una petición con cookie y sin ningún origen se rechaza', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('MISSING_OR_NULL_ORIGIN');
  });
});

describe('las rutas de autenticación heredan la configuración HTTP de la API', () => {
  it('respuesta con cabeceras de seguridad, CORS con credenciales, Vary y sin caché', async () => {
    const app = await startWithUser();

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', APP_ORIGIN)
      .send({ phoneNumber: PHONE, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(APP_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'none'",
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers.vary).toContain('API-Version');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['cache-control']).toContain('no-store');
  });

  it('responde el preflight de CORS antes de llegar a better-auth', async () => {
    const app = await startWithUser();

    const response = await app.http
      .options('/auth/sign-in/phone-number')
      .set('Origin', APP_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(APP_ORIGIN);
  });

  it('las rutas de auth responden aunque no se envíe API-Version (son VERSION_NEUTRAL)', async () => {
    const app = await startWithUser();

    const response = await app.http
      .get('/auth/get-session')
      .set('API-Version', '2');

    expect(response.status).toBe(200);
  });
});
