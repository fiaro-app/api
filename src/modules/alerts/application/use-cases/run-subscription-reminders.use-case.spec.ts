import { describe, expect, it, vi } from 'vitest';
import { RunSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/run-subscription-reminders.use-case.js';
import type { SendSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/send-subscription-reminders.use-case.js';

function setup(claimed: boolean) {
  const claim = vi.fn(() => Promise.resolve(claimed));
  const finish = vi.fn(() => Promise.resolve());
  const send = vi.fn(() => Promise.resolve(3));
  const useCase = new RunSubscriptionRemindersUseCase({ claim, finish }, {
    execute: send,
  } as unknown as SendSubscriptionRemindersUseCase);
  return { useCase, claim, finish, send };
}

describe('RunSubscriptionRemindersUseCase', () => {
  it('el primero que reclama el día envía y anota cuántos recordatorios salieron', async () => {
    const { useCase, finish, send } = setup(true);

    expect(await useCase.execute('2026-10-20')).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    expect(finish).toHaveBeenCalledExactlyOnceWith('2026-10-20', 3);
  });

  it('si el día ya estaba reclamado no envía ni anota nada', async () => {
    const { useCase, finish, send } = setup(false);

    expect(await useCase.execute('2026-10-20')).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });
});
