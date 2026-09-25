import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import { QueueAuditLog } from '@/shared/infrastructure/audit/queue-audit-log.js';

const event: AuditEvent = {
  action: 'auth.sign_in.succeeded',
  outcome: 'SUCCESS',
  occurredAt: new Date('2026-09-25T10:00:00.000Z'),
  userId: 'u1',
};

function setup(add = vi.fn(() => Promise.resolve({}))) {
  let next = 0;
  const logger = { error: vi.fn() };
  const audit = new QueueAuditLog(
    { add } as never,
    { next: () => `evt-${String(++next)}` },
    logger,
  );
  return { audit, add, logger };
}

describe('QueueAuditLog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('encola el evento con su acción como nombre, la fecha como texto y su id como jobId', () => {
    const { audit, add } = setup();

    audit.record(event);

    expect(add).toHaveBeenCalledExactlyOnceWith(
      'auth.sign_in.succeeded',
      { ...event, occurredAt: '2026-09-25T10:00:00.000Z' },
      { jobId: 'evt-1' },
    );
  });

  it('no espera a Redis: entrega el evento y termina aunque encolar no responda', () => {
    const { audit, add } = setup(vi.fn(() => new Promise(() => undefined)));

    audit.record(event);

    expect(add).toHaveBeenCalledOnce();
  });

  it('si Redis rechaza el evento, lo escribe en el log y sigue', async () => {
    const { audit, logger } = setup(
      vi.fn(() => Promise.reject(new Error('Connection is closed.'))),
    );

    audit.record(event);
    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledOnce();
    });

    expect(logger.error).toHaveBeenCalledWith(
      'No se pudo encolar el evento de auditoría auth.sign_in.succeeded: Connection is closed..',
    );
  });

  it('un error que no es un Error también queda en el log', async () => {
    const notAnError = 'texto' as unknown as Error;
    const { audit, logger } = setup(vi.fn(() => Promise.reject(notAnError)));

    audit.record(event);
    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledOnce();
    });

    expect(String(logger.error.mock.calls[0]?.[0])).toContain(
      'error desconocido',
    );
  });

  it('si Redis no responde a tiempo, da el evento por no encolado', async () => {
    vi.useFakeTimers();
    const { audit, logger } = setup(vi.fn(() => new Promise(() => undefined)));

    audit.record(event);
    await vi.advanceTimersByTimeAsync(3_000);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(String(logger.error.mock.calls[0]?.[0])).toContain(
      'sin respuesta en 3000 ms',
    );
  });

  it('con Redis sin responder, pasado el límite de pendientes descarta los eventos en lugar de llenar la memoria', () => {
    const { audit, add, logger } = setup(
      vi.fn(() => new Promise(() => undefined)),
    );

    for (let i = 0; i < 500; i++) {
      audit.record(event);
    }
    audit.record(event);

    expect(add).toHaveBeenCalledTimes(500);
    expect(logger.error).toHaveBeenCalledOnce();
    expect(String(logger.error.mock.calls[0]?.[0])).toContain('se descarta');
  });

  it('libera lugar a medida que Redis va aceptando eventos', async () => {
    const { audit, add } = setup();

    for (let i = 0; i < 600; i++) {
      audit.record(event);
      await Promise.resolve();
      await Promise.resolve();
    }

    expect(add).toHaveBeenCalledTimes(600);
  });

  it('cada evento lleva su propio id', () => {
    const { audit, add } = setup();

    audit.record(event);
    audit.record(event);

    const jobIds = add.mock.calls.map(
      (call) =>
        (call as unknown as [string, unknown, { jobId: string }])[2].jobId,
    );
    expect(jobIds).toEqual(['evt-1', 'evt-2']);
  });
});
