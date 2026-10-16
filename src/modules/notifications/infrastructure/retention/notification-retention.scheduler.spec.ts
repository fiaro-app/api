import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env.js';
import type { PurgeOldNotificationsUseCase } from '@/modules/notifications/application/use-cases/purge-old-notifications.use-case.js';
import { NotificationRetentionScheduler } from '@/modules/notifications/infrastructure/retention/notification-retention.scheduler.js';

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(
  days: number,
  execute: () => Promise<number> = () => Promise.resolve(3),
) {
  const purge = vi.fn(execute);
  const scheduler = new NotificationRetentionScheduler(
    { notificationRetention: { days } } as unknown as Env,
    { execute: purge } as unknown as PurgeOldNotificationsUseCase,
  );
  return { scheduler, purge };
}

describe('NotificationRetentionScheduler', () => {
  it('con 0 días no programa nada', () => {
    const { scheduler, purge } = setup(0);

    scheduler.onApplicationBootstrap();

    expect(vi.getTimerCount()).toBe(0);
    expect(purge).not.toHaveBeenCalled();
  });

  it('borra al arrancar y luego cada 24 horas, con el límite configurado', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { scheduler, purge } = setup(90);

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(purge).toHaveBeenCalledWith(90);
    await vi.advanceTimersByTimeAsync(DAY_MS);

    expect(purge).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith('Se borraron 3 notificaciones viejas.');
  });

  it('no anota nada cuando no había nada que borrar', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { scheduler } = setup(90, () => Promise.resolve(0));

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);

    expect(log).not.toHaveBeenCalled();
  });

  it('un fallo se anota y no detiene el siguiente intento', async () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { scheduler, purge } = setup(90, () =>
      Promise.reject(new Error('caída')),
    );

    scheduler.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(DAY_MS);

    expect(error).toHaveBeenCalled();
    expect(purge).toHaveBeenCalledTimes(2);
  });

  it('al apagar la aplicación deja de programar', () => {
    const { scheduler } = setup(90);
    scheduler.onApplicationBootstrap();

    scheduler.onApplicationShutdown();

    expect(vi.getTimerCount()).toBe(0);
  });
});
