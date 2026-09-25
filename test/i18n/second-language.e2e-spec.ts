import { describe, expect, it } from 'vitest';
import { FLAT_CATALOGS } from '@/shared/infrastructure/i18n/message-catalog.js';
import {
  PASSWORD,
  PHONE,
  nextIp,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';

const { startWithUser } = useAuthApp();

/**
 * Un segundo idioma de mentira: prueba que la aplicación ensamblada responde en el idioma que
 * pide `Accept-Language` sin que ninguna ruta, guard ni pipe tenga texto propio. Agregar un
 * idioma real es agregar su catálogo en `src/i18n`.
 */
const ENGLISH = {
  'errors.UNAUTHENTICATED': 'Sign in to continue.',
  'errors.INVALID_PHONE_NUMBER_OR_PASSWORD':
    'The phone number or the password is wrong.',
  'errors.RATE_LIMITED': 'Too many requests. Try again in a few seconds.',
  'errors.NOT_FOUND': 'We could not find what you are looking for.',
  'errors.VALIDATION_FAILED': 'The data sent is not valid.',
  'validation.invalid_type.missing': 'This field is required.',
  'validation.unrecognized_keys': 'Unexpected field: {keys}.',
};

const withEnglish = {
  languages: ['es', 'en'],
  catalogs: { es: FLAT_CATALOGS.es ?? {}, en: ENGLISH },
};

describe('la aplicación ensamblada con un segundo idioma', () => {
  it('el guard global responde 401 en el idioma pedido, y en español sin la cabecera', async () => {
    const app = await startWithUser(withEnglish);

    const english = await whoami(app).set('Accept-Language', 'en');
    const spanish = await whoami(app);

    expect(english.body.message).toBe('Sign in to continue.');
    expect(english.headers['content-language']).toBe('en');
    expect(spanish.body.message).toBe('Inicia sesión para continuar.');
    expect(spanish.headers['content-language']).toBe('es');
  });

  it('un error de better-auth sale en el idioma pedido, no en el inglés de la librería', async () => {
    const app = await startWithUser(withEnglish);

    const response = await signIn(app, {
      password: 'no-es-la-contraseña',
      language: 'en-US,en;q=0.9,es;q=0.5',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
      message: 'The phone number or the password is wrong.',
    });
    expect(response.headers['content-language']).toBe('en');
    expect(response.headers.vary).toContain('Accept-Language');
  });

  it('el rate limit de better-auth (429) sale en el idioma pedido', async () => {
    const app = await startWithUser(withEnglish);
    const ip = nextIp();
    for (let i = 0; i < 5; i++) {
      await signIn(app, { password: 'incorrecta-a-proposito', ip });
    }

    const blocked = await signIn(app, { ip, language: 'en' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe(
      'Too many requests. Try again in a few seconds.',
    );
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('el 404 de una ruta que no existe sale en el idioma pedido', async () => {
    const app = await startWithUser(withEnglish);

    const { body } = await app.http
      .get('/no-existe')
      .set('Accept-Language', 'en')
      .expect(404);

    expect(body.message).toBe('We could not find what you are looking for.');
  });

  it('la validación traduce el detalle de cada campo con los valores de la falla', async () => {
    const app = await startWithUser(withEnglish);

    const { body } = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .set('Accept-Language', 'en')
      .send({ phoneNumber: PHONE, admin: true })
      .expect(400);

    expect(body).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'The data sent is not valid.',
    });
    expect(body.issues).toEqual([
      { path: ['password'], message: 'This field is required.' },
      { path: [], message: 'Unexpected field: admin.' },
    ]);
  });

  it('un mensaje que el schema escribió (los de contracts) sale tal cual en cualquier idioma', async () => {
    const app = await startWithUser(withEnglish);

    const { body } = await app.http
      .post('/auth/sign-in/phone-number')
      .set('X-Forwarded-For', nextIp())
      .set('Accept-Language', 'en')
      .send({ phoneNumber: '3001234567', password: PASSWORD })
      .expect(400);

    expect(body.issues[0].path).toEqual(['phoneNumber']);
    expect(body.issues[0].message).toBe(
      'Ingresa un celular colombiano válido de 10 dígitos.',
    );
  });
});
