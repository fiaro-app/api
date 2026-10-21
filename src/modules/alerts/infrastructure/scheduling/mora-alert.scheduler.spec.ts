import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env.js';
import type { RunMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/run-mora-alerts.use-case.js';
import type { RunSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/run-subscription-reminders.use-case.js';
import { MoraAlertScheduler } from '@/modules/alerts/infrastructure/scheduling/mora-alert.scheduler.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(options: {
  readonly now: string;
  readonly enabled?: boolean;
  readonly execute?: (businessDate: string) => Promise<boolean>;
  readonly executeReminders?: (businessDate: string) => Promise<boolean>;
}) {
  vi.setSystemTime(new Date(options.now));
  const execute = vi.fn<(businessDate: string) => Promise<boolean>>(
    options.execute ?? (() => Promise.resolve(true)),
  );
  const runMoraAlerts = { execute } as unknown as RunMoraAlertsUseCase;
  const executeReminders = vi.fn<(businessDate: string) => Promise<boolean>>(
    options.executeReminders ?? (() => Promise.resolve(true)),
  );
  const runReminders = {
    execute: executeReminders,
  } as unknown as RunSubscriptionRemindersUseCase;
  const clock: Clock = { now: () => new Date() };
  const env = {
    moraAlerts: { enabled: options.enabled ?? true },
  } as unknown as Env;
  const scheduler = new MoraAlertScheduler(
    env,
    runMoraAlerts,
    runReminders,
    clock,
  );
  return { scheduler, execute, executeReminders };
}

describe('MoraAlertScheduler', () => {
  it('desactivado, no programa nada', () => {
    const { scheduler, execute } = setup({
      now: '2026-10-06T10:00:00.000Z',
      enabled: false,
    });

    scheduler.onApplicationBootstrap();

    expect(vi.getTimerCount()).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it('antes de las 13:00 UTC espera la hora y envía el aviso del día', async () => {
    const { scheduler, execute } = setup({ now: '2026-10-06T10:00:00.000Z' });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(2 * HOUR_MS);
    expect(execute).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(HOUR_MS);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith('2026-10-06');
  });

  it('después de la hora, si el día no se envió, lo envía de inmediato', async () => {
    const { scheduler, execute } = setup({ now: '2026-10-06T15:00:00.000Z' });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(execute).toHaveBeenCalledWith('2026-10-06');
  });

  it('cada día programa el siguiente envío a la misma hora', async () => {
    const { scheduler, execute } = setup({ now: '2026-10-06T10:00:00.000Z' });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(3 * HOUR_MS);
    await vi.advanceTimersByTimeAsync(24 * HOUR_MS);

    expect(execute.mock.calls).toEqual([['2026-10-06'], ['2026-10-07']]);
  });

  it('al cerrar la aplicación cancela el envío pendiente', async () => {
    const { scheduler, execute } = setup({ now: '2026-10-06T10:00:00.000Z' });

    scheduler.onApplicationBootstrap();
    scheduler.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(4 * HOUR_MS);

    expect(execute).not.toHaveBeenCalled();
  });

  it('si el envío falla, lo registra y no lanza', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { scheduler } = setup({
      now: '2026-10-06T15:00:00.000Z',
      execute: () => Promise.reject(new Error('base de datos caída')),
    });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(logError).toHaveBeenCalledWith(
      'El aviso de mora del 2026-10-06 falló: Error: base de datos caída.',
    );
  });

  it('si el día ya estaba enviado, no lo cuenta como envío nuevo', async () => {
    const logLog = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { scheduler } = setup({
      now: '2026-10-06T15:00:00.000Z',
      execute: () => Promise.resolve(false),
      executeReminders: () => Promise.resolve(false),
    });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(logLog).not.toHaveBeenCalled();
  });

  it('cuando sí envía, lo deja escrito en el log', async () => {
    const logLog = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { scheduler } = setup({ now: '2026-10-06T15:00:00.000Z' });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(logLog).toHaveBeenCalledWith(
      'Aviso de mora del 2026-10-06 enviado.',
    );
  });

  it('el mismo día también manda los recordatorios de vencimiento del plan', async () => {
    const logLog = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { scheduler, executeReminders } = setup({
      now: '2026-10-06T15:00:00.000Z',
    });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(executeReminders).toHaveBeenCalledExactlyOnceWith('2026-10-06');
    expect(logLog).toHaveBeenCalledWith(
      'Recordatorios de vencimiento del plan del 2026-10-06 enviados.',
    );
  });

  it('si falla el aviso de mora, los recordatorios salen igual', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { scheduler, executeReminders } = setup({
      now: '2026-10-06T15:00:00.000Z',
      execute: () => Promise.reject(new Error('mora caída')),
    });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(executeReminders).toHaveBeenCalledWith('2026-10-06');
  });

  it('si fallan los recordatorios, lo registra y no lanza', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { scheduler } = setup({
      now: '2026-10-06T15:00:00.000Z',
      executeReminders: () => Promise.reject(new Error('correo caído')),
    });

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(logError).toHaveBeenCalledWith(
      'Los recordatorios de vencimiento del plan del 2026-10-06 fallaron: Error: correo caído.',
    );
  });
});
