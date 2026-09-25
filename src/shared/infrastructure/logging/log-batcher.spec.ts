import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOG_BATCH_JOB_NAME,
  LOG_BATCH_JOB_OPTIONS,
  LOG_BATCH_LIMITS,
  type LogBatchLimits,
} from '@/shared/infrastructure/logging/log-batch.js';
import { LogBatcher } from '@/shared/infrastructure/logging/log-batcher.js';
import { ENQUEUE_TIMEOUT_MS } from '@/shared/infrastructure/messaging/records-queue.js';

const LIMITS: LogBatchLimits = {
  intervalMs: 1_000,
  maxLines: 3,
  maxBytes: 100_000,
  maxInFlight: 2,
  maxLineLength: 400,
};

const line = (msg: string, fields: Record<string, unknown> = {}): string =>
  `${JSON.stringify({ level: 'info', time: '2026-09-25T10:00:00.000Z', msg, ...fields })}\n`;

const entry = (msg: string) => ({
  level: 'info',
  time: '2026-09-25T10:00:00.000Z',
  msg,
});

function setup(
  implementation: (...args: unknown[]) => Promise<unknown> = () =>
    Promise.resolve({}),
  limits: LogBatchLimits = LIMITS,
) {
  let next = 0;
  const add = vi.fn(implementation);
  const warn = vi.fn();
  const batcher = new LogBatcher(
    { add },
    { next: () => `lote-${String(++next)}` },
    warn,
    limits,
  );
  return { batcher, add, warn };
}

const NOT_AN_ERROR = 'texto suelto' as unknown as Error;

const never = () => new Promise<never>(() => undefined);

describe('LogBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('cuándo envía un lote', () => {
    it('no envía nada mientras no pasa el intervalo ni se llena el lote', async () => {
      const { batcher, add } = setup();

      batcher.write(line('a'));
      batcher.write(line('b'));
      await vi.advanceTimersByTimeAsync(999);

      expect(add).not.toHaveBeenCalled();
    });

    it('al pasar el intervalo envía las líneas con el nombre del trabajo, sus reintentos y un id', async () => {
      const { batcher, add } = setup();

      batcher.write(line('a'));
      batcher.write(line('b'));
      await vi.advanceTimersByTimeAsync(1_000);

      expect(add).toHaveBeenCalledExactlyOnceWith(
        LOG_BATCH_JOB_NAME,
        { entries: [entry('a'), entry('b')] },
        { ...LOG_BATCH_JOB_OPTIONS, jobId: 'lote-1' },
      );
    });

    it('el intervalo cuenta desde la primera línea, no desde la última', async () => {
      const { batcher, add } = setup();

      batcher.write(line('a'));
      await vi.advanceTimersByTimeAsync(600);
      batcher.write(line('b'));
      await vi.advanceTimersByTimeAsync(400);

      expect(add).toHaveBeenCalledOnce();
      expect(add).toHaveBeenCalledWith(
        LOG_BATCH_JOB_NAME,
        { entries: [entry('a'), entry('b')] },
        expect.anything(),
      );
    });

    it('sin líneas no hay temporizador, ni después de enviar', async () => {
      const { batcher } = setup();
      expect(vi.getTimerCount()).toBe(0);

      batcher.write(line('a'));
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(1_000);

      expect(vi.getTimerCount()).toBe(0);
    });

    it('el temporizador no mantiene vivo el proceso', () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');
      const { batcher } = setup();

      batcher.write(line('a'));

      const timer = spy.mock.results[0]?.value as NodeJS.Timeout;
      expect(timer.hasRef()).toBe(false);
    });

    it('con el máximo de líneas envía sin esperar el intervalo', async () => {
      const { batcher, add } = setup();

      batcher.write(line('a'));
      batcher.write(line('b'));
      batcher.write(line('c'));
      await vi.advanceTimersByTimeAsync(0);

      expect(add).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('con el máximo de bytes envía sin esperar el intervalo', async () => {
      const { batcher, add } = setup(undefined, {
        ...LIMITS,
        maxBytes: line('a').length * 2,
      });

      batcher.write(line('a'));
      batcher.write(line('b'));
      await vi.advanceTimersByTimeAsync(0);

      expect(add).toHaveBeenCalledOnce();
    });

    it('cada lote lleva un id nuevo', async () => {
      const { batcher, add } = setup();

      batcher.write(line('a'));
      await batcher.flush();
      batcher.write(line('b'));
      await batcher.flush();

      expect(
        add.mock.calls.map((call) => (call[2] as { jobId: string }).jobId),
      ).toEqual(['lote-1', 'lote-2']);
    });

    it('con los límites por defecto espera cinco minutos', async () => {
      const { add } = setup();
      const defaults = new LogBatcher({ add }, { next: () => 'lote' }, vi.fn());

      defaults.write(line('a'));
      await vi.advanceTimersByTimeAsync(LOG_BATCH_LIMITS.intervalMs - 1);
      expect(add).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(add).toHaveBeenCalledOnce();
    });
  });

  describe('qué guarda', () => {
    it('quita lo que no es una línea de log y los eventos de auditoría', async () => {
      const { batcher, add } = setup();

      batcher.write(line('una petición'));
      batcher.write(line('evento', { audit: true }));
      batcher.write('esto no es json\n');
      await batcher.flush();

      expect(add).toHaveBeenCalledWith(
        LOG_BATCH_JOB_NAME,
        { entries: [entry('una petición')] },
        expect.anything(),
      );
    });

    it('si no queda ninguna línea no encola nada', async () => {
      const { batcher, add } = setup();

      batcher.write(line('evento', { audit: true }));
      await batcher.flush();

      expect(add).not.toHaveBeenCalled();
    });

    it('flush sin líneas no hace nada', async () => {
      const { batcher, add, warn } = setup();

      await batcher.flush();

      expect(add).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it('flush envía ahora lo guardado y apaga el temporizador', async () => {
      const { batcher, add } = setup();

      batcher.write(line('a'));
      await batcher.flush();

      expect(add).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('una línea demasiado larga no se guarda y se avisa al enviar', async () => {
      const { batcher, add, warn } = setup();

      batcher.write(line('larga', { relleno: 'x'.repeat(500) }));
      batcher.write(line('normal'));
      await batcher.flush();

      expect(add).toHaveBeenCalledWith(
        LOG_BATCH_JOB_NAME,
        { entries: [entry('normal')] },
        expect.anything(),
      );
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('demasiado largas'),
      );
    });
  });

  describe('cuando Redis falla', () => {
    it('avisa con el motivo, descarta el lote y sigue', async () => {
      const { batcher, warn } = setup(() =>
        Promise.reject(new Error('Connection is closed.')),
      );

      batcher.write(line('a'));
      await batcher.flush();

      expect(warn).toHaveBeenCalledExactlyOnceWith(
        'No se pudo encolar un lote de líneas de log para MongoDB: Connection is closed.. Siguen saliendo por la salida estándar.',
      );
    });

    it('un AggregateError sin mensaje dice el motivo de cada intento', async () => {
      const { batcher, warn } = setup(() =>
        Promise.reject(
          new AggregateError([new Error('connect ECONNREFUSED ::1:6379')], ''),
        ),
      );

      batcher.write(line('a'));
      await batcher.flush();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('connect ECONNREFUSED ::1:6379'),
      );
    });

    it('un rechazo que no es un Error se avisa como desconocido', async () => {
      const { batcher, warn } = setup(() => Promise.reject(NOT_AN_ERROR));

      batcher.write(line('a'));
      await batcher.flush();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('error desconocido'),
      );
    });

    it('si Redis no responde, el lote se descarta cuando se agota el tiempo', async () => {
      const { batcher, warn } = setup(never);

      batcher.write(line('a'));
      const flushed = batcher.flush();
      await vi.advanceTimersByTimeAsync(ENQUEUE_TIMEOUT_MS);
      await flushed;

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('sin respuesta en 3000 ms'),
      );
    });

    it('con el máximo de lotes esperando a Redis descarta el siguiente y avisa', async () => {
      const { batcher, add, warn } = setup(never, { ...LIMITS, maxLines: 1 });

      batcher.write(line('a'));
      batcher.write(line('b'));
      batcher.write(line('c'));

      expect(add).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('hay lotes de líneas de log esperando'),
      );
      await vi.advanceTimersByTimeAsync(ENQUEUE_TIMEOUT_MS);
    });

    it('cuando los lotes terminan vuelve a encolar', async () => {
      const { batcher, add } = setup(
        vi
          .fn()
          .mockImplementationOnce(never)
          .mockImplementationOnce(never)
          .mockResolvedValue({}),
        { ...LIMITS, maxLines: 1 },
      );

      batcher.write(line('a'));
      batcher.write(line('b'));
      await vi.advanceTimersByTimeAsync(ENQUEUE_TIMEOUT_MS);
      batcher.write(line('c'));
      await vi.advanceTimersByTimeAsync(0);

      expect(add).toHaveBeenCalledTimes(3);
    });
  });

  describe('al apagar', () => {
    it('close envía lo que quede y deja de guardar líneas', async () => {
      const { batcher, add } = setup();

      batcher.write(line('a'));
      await batcher.close();
      batcher.write(line('b'));
      await batcher.flush();

      expect(add).toHaveBeenCalledOnce();
      expect(add).toHaveBeenCalledWith(
        LOG_BATCH_JOB_NAME,
        { entries: [entry('a')] },
        expect.anything(),
      );
    });
  });
});
