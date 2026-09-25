import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuditAction } from '@/shared/domain/audit/audit-event.js';
import {
  nextIp,
  PASSWORD,
  PHONE,
  signIn,
  useAuthApp,
} from '@test/support/auth-flow.js';
import {
  type DurableAuditInfra,
  startDurableAuditInfra,
} from '@test/support/durable-audit.js';
import { captureLogs } from '@test/support/log-capture.js';

const { startWithUser } = useAuthApp();

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let infra: DurableAuditInfra;

beforeAll(async () => {
  infra = await startDurableAuditInfra();
});

afterAll(async () => {
  await infra.close();
});

/** Espera a que el consumidor haya guardado `count` eventos con esa acción. */
const eventsOf = async (action: AuditAction, count = 1) => {
  await vi.waitFor(
    async () => {
      expect(await infra.events.countDocuments({ action })).toBe(count);
    },
    { timeout: 15_000, interval: 100 },
  );
  return infra.events.find({ action }).toArray();
};

describe('auditoría durable: de la API a MongoDB por la cola', () => {
  it('un inicio de sesión llega a MongoDB con el celular enmascarado', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: { ...infra.env, LOG_LEVEL: 'info' },
      logDestination: logs.destination,
    });
    const ip = nextIp();

    const response = await signIn(app, { ip });
    const [event] = await eventsOf('auth.sign_in.succeeded');

    expect(event).toMatchObject({
      action: 'auth.sign_in.succeeded',
      outcome: 'SUCCESS',
      phone: { last4: '4567', hash: expect.stringMatching(/^[0-9a-f]{32}$/) },
      details: { mustChangePassword: false },
      requestId: response.headers['x-request-id'],
      ip,
    });
    expect(event?._id).toMatch(UUID);
    expect(event?.userId).toEqual(expect.any(String));
    expect(event?.occurredAt).toBeInstanceOf(Date);
    expect(event?.recordedAt.getTime()).toBeGreaterThanOrEqual(
      event?.occurredAt.getTime() ?? Infinity,
    );
    expect(JSON.stringify(event)).not.toContain(PHONE);
    expect(JSON.stringify(event)).not.toContain(PASSWORD);
  });

  it('el mismo evento sale también por el log', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: { ...infra.env, LOG_LEVEL: 'info' },
      logDestination: logs.destination,
    });

    await signIn(app, { password: 'no-es-la-contraseña' });
    const [stored] = await eventsOf('auth.sign_in.failed');

    const logged = logs.entries().find((entry) => entry.audit === true);
    expect(logged).toMatchObject({
      event: 'auth.sign_in.failed',
      phone: stored?.phone,
      reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
    });
    expect(stored).toMatchObject({
      outcome: 'FAILURE',
      reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
    });
    expect(stored).not.toHaveProperty('userId');
  });

  it('crea el índice que borra los eventos al año', async () => {
    const app = await startWithUser({ env: infra.env });
    await signIn(app);
    await eventsOf('auth.sign_in.succeeded', 1);

    const indexes = await infra.events.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'occurredAt_ttl',
          expireAfterSeconds: 31_536_000,
        }),
        expect.objectContaining({ name: 'phoneHash_occurredAt', sparse: true }),
        expect.objectContaining({ name: 'userId_occurredAt', sparse: true }),
      ]),
    );
  });

  it('un trabajo que BullMQ vuelve a procesar no duplica el evento', async () => {
    const app = await startWithUser({ env: infra.env });
    await signIn(app, { password: 'no-es-la-contraseña' });
    const [original] = await eventsOf('auth.sign_in.failed', 2);
    const connection = new Redis(infra.env.REDIS_URL ?? '', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('audit', {
      connection,
      prefix: infra.env.QUEUE_PREFIX,
    });

    await queue.add(
      'auth.sign_in.failed',
      { ...original, occurredAt: original?.occurredAt.toISOString() },
      { jobId: String(original?._id), removeOnComplete: true },
    );
    await vi.waitFor(
      async () => {
        const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
        expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(0);
      },
      { timeout: 15_000, interval: 100 },
    );

    expect(
      await infra.events.countDocuments({ _id: String(original?._id) }),
    ).toBe(1);
    await queue.close();
    connection.disconnect();
  });

  it('con Redis caído el inicio de sesión responde 200 y el evento sale igual por el log', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: {
        ...infra.env,
        REDIS_URL: 'redis://127.0.0.1:1',
        LOG_LEVEL: 'info',
      },
      logDestination: logs.destination,
    });

    const response = await signIn(app);

    expect(response.status).toBe(200);
    expect(
      logs
        .entries()
        .filter((entry) => entry.event === 'auth.sign_in.succeeded'),
    ).toHaveLength(1);
  });

  it('con MongoDB caído el inicio de sesión responde 200 y el evento espera en la cola', async () => {
    const prefix = infra.ownQueuePrefix('mongo-caido');
    const app = await startWithUser({
      env: {
        ...infra.env,
        MONGODB_URI: 'mongodb://fiaro:fiaro@127.0.0.1:1/fiaro',
        QUEUE_PREFIX: prefix,
      },
    });
    const connection = new Redis(infra.env.REDIS_URL ?? '', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue('audit', { connection, prefix });

    const response = await signIn(app);

    expect(response.status).toBe(200);
    await vi.waitFor(
      async () => {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'delayed',
          'failed',
        );
        expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(1);
      },
      { timeout: 15_000, interval: 100 },
    );
    await queue.close();
    connection.disconnect();
  });
});
