import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LOG_BATCH_JOB_NAME } from '@/shared/infrastructure/logging/log-batch.js';
import type { LogBatcher } from '@/shared/infrastructure/logging/log-batcher.js';
import { LOG_BATCHER } from '@/shared/infrastructure/logging/log-batcher.token.js';
import { RECORDS_QUEUE_NAME } from '@/shared/infrastructure/messaging/records-queue.js';
import {
  cookieOf,
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

const LOG_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:\d+$/;

const WRONG_PASSWORD = 'no-es-la-contraseña';

let infra: DurableAuditInfra;

beforeAll(async () => {
  infra = await startDurableAuditInfra();
});

afterAll(async () => {
  await infra.close();
});

/** Levanta la API contra la infraestructura de la corrida, con los logs capturados (no ensucian la salida). */
const start = async (env: NodeJS.ProcessEnv = {}) => {
  const logs = captureLogs();
  const app = await startWithUser({
    env: { ...infra.env, LOG_LEVEL: 'info', ...env },
    logDestination: logs.destination,
  });
  return { app, logs };
};

const batcherOf = (app: TestApp): LogBatcher =>
  app.app.get<LogBatcher>(LOG_BATCHER, { strict: false });

/** Una petición que la API rechaza (401): su línea de petición es `warn`, el nivel que llega a MongoDB. */
const rejectedSignIn = (app: TestApp) =>
  signIn(app, { password: WRONG_PASSWORD });

/** Espera a que el consumidor haya guardado las líneas de esa petición. */
const linesOf = async (requestId: string) => {
  await vi.waitFor(
    async () => {
      expect(await infra.logs.countDocuments({ requestId })).toBeGreaterThan(0);
    },
    { timeout: 15_000, interval: 100 },
  );
  return infra.logs.find({ requestId }).toArray();
};

const requestIdOf = (response: { headers: Record<string, unknown> }): string =>
  String(response.headers['x-request-id']);

describe('líneas de log por lotes: de la API a MongoDB por la cola', () => {
  it('la línea de una petición rechazada llega a MongoDB con lo mismo que salió por el log', async () => {
    const { app, logs } = await start();

    const response = await rejectedSignIn(app);
    await batcherOf(app).flush();
    const requestId = requestIdOf(response);
    const [stored] = (await linesOf(requestId)).filter(
      (line) => line.msg === 'request completed',
    );

    const written = logs
      .entries()
      .find(
        (entry) =>
          entry.requestId === requestId && entry.msg === 'request completed',
      );
    expect(stored).toMatchObject({
      level: 'warn',
      msg: 'request completed',
      requestId,
      req: { method: 'POST', path: '/auth/sign-in/phone-number' },
      res: { statusCode: 401 },
    });
    expect(stored?._id).toMatch(LOG_ID);
    expect(stored?.time).toBeInstanceOf(Date);
    expect(stored?.recordedAt).toBeInstanceOf(Date);
    expect(stored?.time.toISOString()).toBe(written?.time);
    expect(stored?.route).toBe(written?.route);
  });

  it('solo llegan las líneas de warn hacia arriba: lo que sale bien queda en el log', async () => {
    const { app, logs } = await start();

    const accepted = await signIn(app);
    const rejected = await rejectedSignIn(app);
    await batcherOf(app).flush();
    await linesOf(requestIdOf(rejected));

    const acceptedId = requestIdOf(accepted);
    expect(await infra.logs.countDocuments({ requestId: acceptedId })).toBe(0);
    expect(
      await infra.logs.countDocuments({
        level: { $in: ['trace', 'debug', 'info'] },
      }),
    ).toBe(0);
    expect(
      logs
        .entries()
        .some(
          (entry) =>
            entry.requestId === acceptedId &&
            entry.msg === 'request completed' &&
            entry.level === 'info',
        ),
    ).toBe(true);
  });

  it('no guarda contraseñas, cookies ni tokens, ni los eventos de auditoría', async () => {
    const { app } = await start();

    const response = await signIn(app);
    const cookie = cookieOf(response);
    await whoami(app, cookie);
    const rejected = await rejectedSignIn(app);
    const anonymous = await whoami(app);
    await batcherOf(app).flush();
    await linesOf(requestIdOf(rejected));
    await linesOf(requestIdOf(anonymous));

    const everything = JSON.stringify(await infra.logs.find({}).toArray());
    expect(everything).not.toContain(PASSWORD);
    expect(everything).not.toContain(WRONG_PASSWORD);
    expect(everything).not.toContain(PHONE);
    expect(everything).not.toContain(cookie.split('=')[1]?.split(';')[0] ?? '');
    expect(await infra.logs.countDocuments({ audit: true })).toBe(0);
    expect(await infra.logs.countDocuments({ event: { $exists: true } })).toBe(
      0,
    );
  });

  it('crea el índice que borra las líneas a los 60 días y los dos con que se sigue una petición o una persona', async () => {
    const { app } = await start();
    const response = await rejectedSignIn(app);
    await batcherOf(app).flush();
    await linesOf(requestIdOf(response));

    const indexes = await infra.logs.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'time_ttl',
          expireAfterSeconds: 5_184_000,
        }),
        expect.objectContaining({ name: 'requestId', sparse: true }),
        expect.objectContaining({ name: 'userId_time', sparse: true }),
      ]),
    );
  });

  it('un lote que BullMQ vuelve a procesar no duplica las líneas', async () => {
    const { app } = await start();
    const response = await rejectedSignIn(app);
    await batcherOf(app).flush();
    const stored = await linesOf(requestIdOf(response));
    const batchId = String(stored[0]?._id).split(':')[0] ?? '';
    const batch = await infra.logs
      .find({ _id: { $regex: `^${batchId}:` } })
      .sort({ _id: 1 })
      .toArray();
    const entries = batch.map((document) => ({
      ...Object.fromEntries(
        Object.entries(document).filter(
          ([key]) => key !== '_id' && key !== 'recordedAt',
        ),
      ),
      time: document.time.toISOString(),
    }));
    const connection = new Redis(infra.env.REDIS_URL ?? '', {
      maxRetriesPerRequest: null,
    });
    const queue = new Queue(RECORDS_QUEUE_NAME, {
      connection,
      prefix: infra.env.QUEUE_PREFIX,
    });

    await vi.waitFor(
      async () => {
        expect(await queue.getJob(batchId)).toBeUndefined();
      },
      { timeout: 15_000, interval: 100 },
    );
    const again = await queue.add(
      LOG_BATCH_JOB_NAME,
      { entries },
      { jobId: batchId },
    );
    await vi.waitFor(
      async () => {
        expect(await again.getState()).toBe('completed');
      },
      { timeout: 15_000, interval: 100 },
    );

    expect(
      await infra.logs.countDocuments({ _id: { $regex: `^${batchId}:` } }),
    ).toBe(batch.length);
    await queue.close();
    connection.disconnect();
  });

  it('con Redis caído las peticiones responden igual, enviar el lote no falla y el log sigue completo', async () => {
    const { app, logs } = await start({ REDIS_URL: 'redis://127.0.0.1:1' });

    const response = await rejectedSignIn(app);
    await expect(batcherOf(app).flush()).resolves.toBeUndefined();

    expect(response.status).toBe(401);
    expect(
      logs
        .entries()
        .some(
          (entry) =>
            entry.requestId === requestIdOf(response) &&
            entry.msg === 'request completed',
        ),
    ).toBe(true);
    expect(
      logs
        .entries()
        .some((entry) =>
          String(entry.msg).includes('No se pudo encolar un lote'),
        ),
    ).toBe(true);
  });

  it('al apagar la API envía lo que tenía guardado y la siguiente lo guarda en MongoDB', async () => {
    const env = { QUEUE_PREFIX: infra.ownQueuePrefix('apagado') };
    const { app: first } = await start(env);
    const response = await rejectedSignIn(first);
    const requestId = requestIdOf(response);
    await first.close();

    await start(env);
    const stored = await linesOf(requestId);

    expect(stored.some((line) => line.msg === 'request completed')).toBe(true);
  });
});
