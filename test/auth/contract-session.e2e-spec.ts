import { describe, expect, it } from 'vitest';
import {
  AuthErrorSchema,
  RateLimitedSchema,
  SignInLockedSchema,
  ValidationErrorSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import {
  SessionResponseSchema,
  SignInResponseSchema,
  SignOutResponseSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';
import {
  APP_ORIGIN,
  PASSWORD,
  PHONE,
  login,
  nextIp,
  signIn,
  useAuthApp,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

describe('POST /auth/sign-in/phone-number', () => {
  it('200 cumple SignInResponse y trae la cookie de sesión, sin el token en el cuerpo', async () => {
    const app = await startWithUser();

    const response = await signIn(app);

    expect(response.status).toBe(200);
    expect(SignInResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body).not.toHaveProperty('token');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('400 cumple ValidationError', async () => {
    const app = await startWithUser();

    const response = await signIn(app, { phone: '3001234567' });

    expect(response.status).toBe(400);
    expect(ValidationErrorSchema.safeParse(response.body).success).toBe(true);
  });

  it('401 cumple AuthError con INVALID_PHONE_NUMBER_OR_PASSWORD', async () => {
    const app = await startWithUser();

    const response = await signIn(app, { password: 'no-es-la-contraseña' });

    expect(response.status).toBe(401);
    expect(AuthErrorSchema.parse(response.body).code).toBe(
      'INVALID_PHONE_NUMBER_OR_PASSWORD',
    );
  });

  it('403 cumple AuthError con INVALID_ORIGIN', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', cookie)
      .set('Origin', 'https://sitio-ajeno.example')
      .send({ phoneNumber: PHONE, password: PASSWORD });

    expect(response.status).toBe(403);
    expect(AuthErrorSchema.parse(response.body).code).toBe('INVALID_ORIGIN');
  });

  it('429 cumple RateLimited y trae Retry-After', async () => {
    const app = await startWithUser();
    const ip = nextIp();
    for (let i = 0; i < 5; i++) {
      await signIn(app, { password: 'incorrecta-a-proposito', ip });
    }

    const response = await signIn(app, { ip });

    expect(response.status).toBe(429);
    expect(RateLimitedSchema.safeParse(response.body).success).toBe(true);
    expect(response.headers['retry-after']).toMatch(/^\d+$/);
  });
});

describe('POST /auth/sign-in/phone-number: bloqueo por celular', () => {
  it('429 con SIGN_IN_LOCKED cumple SignInLocked y trae Retry-After', async () => {
    const app = await startWithUser();
    for (let i = 0; i < 5; i++) {
      await signIn(app, { password: 'incorrecta-a-proposito' });
    }

    const response = await signIn(app);

    expect(response.status).toBe(429);
    expect(SignInLockedSchema.safeParse(response.body).success).toBe(true);
    expect(RateLimitedSchema.safeParse(response.body).success).toBe(false);
    expect(response.headers['retry-after']).toMatch(/^\d+$/);
  });
});

describe('GET /auth/get-session', () => {
  it('200 con sesión cumple SessionResponse, sin el token de la sesión', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .get('/auth/get-session')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    const parsed = SessionResponseSchema.parse(response.body);
    expect(parsed?.user.phoneNumber).toBe(PHONE);
    expect(response.body.session).not.toHaveProperty('token');
  });

  it('200 sin sesión responde null, que SessionResponse también admite', async () => {
    const app = await startWithUser();

    const response = await app.http.get('/auth/get-session');

    expect(response.status).toBe(200);
    expect(SessionResponseSchema.parse(response.body)).toBeNull();
  });
});

describe('POST /auth/sign-out', () => {
  it('200 cumple SignOutResponse y borra la cookie', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .set('Origin', APP_ORIGIN);

    expect(response.status).toBe(200);
    expect(SignOutResponseSchema.safeParse(response.body).success).toBe(true);
    expect(
      (response.headers['set-cookie'] as unknown as string[]).join('\n'),
    ).toContain('Max-Age=0');
  });

  it('es idempotente: sin sesión también responde 200', async () => {
    const app = await startWithUser();

    const response = await app.http.post('/auth/sign-out');

    expect(response.status).toBe(200);
    expect(SignOutResponseSchema.safeParse(response.body).success).toBe(true);
  });

  it('403 con un origen que no es de confianza cumple AuthError', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const response = await app.http
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .set('Origin', 'https://sitio-ajeno.example');

    expect(response.status).toBe(403);
    expect(AuthErrorSchema.safeParse(response.body).success).toBe(true);
  });
});
