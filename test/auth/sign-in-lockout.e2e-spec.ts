import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAppWithUser,
  login,
  PASSWORD,
  PHONE,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';
import {
  type DurableAuditInfra,
  startDurableAuditInfra,
} from '@test/support/durable-audit.js';
import { captureLogs } from '@test/support/log-capture.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const UNKNOWN_PHONE = '+573115556677';
const LOCKED_MESSAGE =
  'Demasiados intentos fallidos con este celular. Intenta de nuevo más tarde.';

/** Una contraseña incorrecta distinta en cada intento, cada uno desde su IP (nextIp): el bloqueo es por celular, no por IP. */
const wrong = (app: TestApp, phone = PHONE, count = 1) =>
  Array.from({ length: count }, (_, i) => `incorrecta-${String(i)}`).reduce(
    async (previous, password) => {
      const statuses = await previous;
      statuses.push((await signIn(app, { phone, password })).status);
      return statuses;
    },
    Promise.resolve<number[]>([]),
  );

describe('bloqueo del inicio de sesión por celular', () => {
  it('tras 5 contraseñas incorrectas el sexto intento se rechaza con 429 SIGN_IN_LOCKED, aunque traiga la correcta', async () => {
    const app = await startWithUser();

    const statuses = await wrong(app, PHONE, 5);
    const locked = await signIn(app);

    expect(statuses).toEqual([401, 401, 401, 401, 401]);
    expect(locked.status).toBe(429);
    expect(locked.body).toMatchObject({
      statusCode: 429,
      code: 'SIGN_IN_LOCKED',
      message: LOCKED_MESSAGE,
    });
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(890);
    expect(Number(locked.headers['retry-after'])).toBeLessThanOrEqual(900);
    expect(locked.headers['content-language']).toBe('es');
    expect(locked.headers['set-cookie']).toBeUndefined();
  });

  it('cuatro fallos no bloquean, y un inicio de sesión que sale bien reinicia la cuenta', async () => {
    const app = await startWithUser();

    await wrong(app, PHONE, 4);
    expect((await signIn(app)).status).toBe(200);
    const again = await wrong(app, PHONE, 5);
    const locked = await signIn(app);

    expect(again).toEqual([401, 401, 401, 401, 401]);
    expect(locked.status).toBe(429);
  });

  it('el bloqueo es del celular: otro celular sigue entrando', async () => {
    const app = await startWithUser();
    await app.createUser({
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      password: 'otra-clave-larga-1',
    });
    await wrong(app, PHONE, 5);

    const other = await signIn(app, {
      phone: '+573109998877',
      password: 'otra-clave-larga-1',
    });
    const locked = await signIn(app);

    expect(other.status).toBe(200);
    expect(locked.status).toBe(429);
  });

  it('un celular sin cuenta se bloquea igual: el bloqueo no revela cuáles la tienen', async () => {
    const app = await startWithUser();
    await wrong(app, PHONE, 5);
    await wrong(app, UNKNOWN_PHONE, 5);

    const known = await signIn(app);
    const unknown = await signIn(app, { phone: UNKNOWN_PHONE });

    const shape = (body: Record<string, unknown>) => ({
      statusCode: body.statusCode,
      code: body.code,
      message: body.message,
    });
    expect(unknown.status).toBe(429);
    expect(shape(unknown.body)).toEqual(shape(known.body));
  });

  it('las sesiones que ya estaban abiertas siguen funcionando durante el bloqueo', async () => {
    const app = await startWithUser();
    const cookie = await login(app);
    await wrong(app, PHONE, 5);

    expect((await signIn(app)).status).toBe(429);

    expect((await whoami(app, cookie)).status).toBe(200);
  });

  it('lo audita como auth.sign_in.locked, con el celular enmascarado y cuánto falta', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: { LOG_LEVEL: 'info' },
      logDestination: logs.destination,
    });
    await wrong(app, PHONE, 5);

    await signIn(app);

    const events = logs
      .entries()
      .filter((entry) => entry.event === 'auth.sign_in.locked');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      audit: true,
      outcome: 'FAILURE',
      reason: 'SIGN_IN_LOCKED',
      phone: { last4: '4567' },
      details: { retryAfterSeconds: expect.any(Number) },
    });
    expect(logs.text()).not.toContain('3001234567');
  });
});

describe('bloqueo del inicio de sesión con Redis', () => {
  let infra: DurableAuditInfra;

  beforeAll(async () => {
    infra = await startDurableAuditInfra();
  });

  afterAll(async () => {
    await infra.close();
  });

  it('cuenta lo mismo en todas las instancias de la API', async () => {
    const env = {
      REDIS_URL: infra.env.REDIS_URL,
      QUEUE_PREFIX: infra.ownQueuePrefix('bloqueo'),
    };
    const first = await createAppWithUser({ env });
    const second = await createAppWithUser({ env });
    try {
      const fromFirst = await wrong(first, PHONE, 3);
      const fromSecond = await wrong(second, PHONE, 2);

      const locked = await signIn(first);

      expect([...fromFirst, ...fromSecond]).toEqual([401, 401, 401, 401, 401]);
      expect(locked.status).toBe(429);
      expect(locked.body.code).toBe('SIGN_IN_LOCKED');
      expect((await signIn(second, { password: PASSWORD })).status).toBe(429);
    } finally {
      await second.close();
      await first.close();
    }
  });

  it('un inicio de sesión que sale bien reinicia la cuenta en todas las instancias', async () => {
    const env = {
      REDIS_URL: infra.env.REDIS_URL,
      QUEUE_PREFIX: infra.ownQueuePrefix('reinicio'),
    };
    const first = await createAppWithUser({ env });
    const second = await createAppWithUser({ env });
    try {
      await wrong(first, PHONE, 4);
      expect((await signIn(second)).status).toBe(200);

      const again = await wrong(first, PHONE, 5);

      expect(again).toEqual([401, 401, 401, 401, 401]);
    } finally {
      await second.close();
      await first.close();
    }
  });
});

describe('bloqueo del inicio de sesión sin Redis disponible', () => {
  it('no impide iniciar sesión: sin poder contar, los intentos pasan', async () => {
    const app = await startWithUser({
      env: { REDIS_URL: 'redis://127.0.0.1:1' },
    });

    const statuses = await wrong(app, PHONE, 7);
    const correct = await signIn(app);

    expect(statuses).toEqual([401, 401, 401, 401, 401, 401, 401]);
    expect(correct.status).toBe(200);
  });
});
