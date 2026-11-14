import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/send-subscription-reminders.use-case.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type {
  ListRenewalTargetsUseCase,
  RenewalTarget,
} from '@/modules/subscriptions/application/use-cases/list-renewal-targets.use-case.js';
import { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';

/** 08:00 de Bogotá del 20 de octubre de 2026. */
const NOW = new Date('2026-10-20T13:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.restoreAllMocks();
});

const target = (
  tenantId: string,
  endsAt: Date,
  owners: RenewalTarget['owners'],
  planCode: 'TRIAL' | 'PRO' = 'PRO',
): RenewalTarget => ({
  subscription: Subscription.create({
    id: `sub-${tenantId}`,
    tenantId,
    planCode,
    maxActiveLenders: 1,
    maxCollectors: 5,
    maxAdmins: 3,
    maxPortfolios: 4,
    maxActiveLoans: null,
    currentPeriodEndsAt: endsAt,
    createdAt: NOW,
  }),
  owners,
});

function setup(
  targets: readonly RenewalTarget[],
  notify: (input: { recipientUserId: string }) => Promise<unknown> = () =>
    Promise.resolve({}),
) {
  const list = vi.fn(() => Promise.resolve(targets));
  const execute = vi.fn(notify);
  const useCase = new SendSubscriptionRemindersUseCase(
    { execute: list } as unknown as ListRenewalTargetsUseCase,
    { execute } as unknown as CreateNotificationUseCase,
    { now: () => NOW },
  );
  return { useCase, list, execute };
}

const OWNER = { userId: 'user-1', lenderId: 'lender-1' };

describe('SendSubscriptionRemindersUseCase', () => {
  it('pide los negocios que vencen en la ventana que cubre los avisos', async () => {
    const { useCase, list } = setup([]);

    await useCase.execute();

    const [from, to] = list.mock.calls[0] as unknown as [Date, Date];
    expect(NOW.getTime() - from.getTime()).toBeGreaterThanOrEqual(8 * DAY_MS);
    expect(to.getTime() - NOW.getTime()).toBeGreaterThanOrEqual(7 * DAY_MS);
  });

  it('le recuerda a la dueña el día que toca, como una notificación del plan', async () => {
    const { useCase, execute } = setup([
      target('t1', new Date(NOW.getTime() + 3 * DAY_MS + 4 * 3600_000), [
        OWNER,
      ]),
    ]);

    expect(await useCase.execute()).toBe(1);
    expect(execute).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'WARNING',
      title: 'Tu plan vence pronto',
      body: expect.stringContaining('en 3 días') as string,
      relatedEntityType: 'SUBSCRIPTION',
      relatedEntityId: 'sub-t1',
    });
  });

  it('un negocio en la prueba habla de la prueba', async () => {
    const { useCase, execute } = setup([
      target(
        't1',
        new Date(NOW.getTime() + DAY_MS + 4 * 3600_000),
        [OWNER],
        'TRIAL',
      ),
    ]);

    await useCase.execute();

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tu prueba gratis termina pronto' }),
    );
  });

  it('los días que no tocan no manda nada', async () => {
    const { useCase, execute } = setup([
      target('t1', new Date(NOW.getTime() + 5 * DAY_MS), [OWNER]),
    ]);

    expect(await useCase.execute()).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it('avisa a cada dueña y suma a cuántas avisó entre todos los negocios', async () => {
    const { useCase, execute } = setup([
      target('t1', new Date(NOW.getTime() + DAY_MS + 4 * 3600_000), [
        OWNER,
        { userId: 'user-2', lenderId: 'lender-1' },
      ]),
      target('t2', new Date(NOW.getTime() - 2 * DAY_MS), [
        { userId: 'user-3', lenderId: 'lender-3' },
      ]),
      target('t3', new Date(NOW.getTime() + DAY_MS + 4 * 3600_000), []),
    ]);

    expect(await useCase.execute()).toBe(3);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('si avisar a una persona falla lo registra y las demás reciben el suyo', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { useCase } = setup(
      [
        target('t1', new Date(NOW.getTime() + DAY_MS + 4 * 3600_000), [
          OWNER,
          { userId: 'user-2', lenderId: 'lender-1' },
        ]),
      ],
      (input) =>
        input.recipientUserId === 'user-1'
          ? Promise.reject(new Error('correo caído'))
          : Promise.resolve({}),
    );

    expect(await useCase.execute()).toBe(1);
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('correo caído'),
    );
  });
});
