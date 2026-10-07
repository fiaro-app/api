import { describe, expect, it, vi } from 'vitest';
import type { SendMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/send-mora-alerts.use-case.js';
import { RunMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/run-mora-alerts.use-case.js';
import type { MoraAlertsResult } from '@/modules/alerts/domain/mora/mora-alerts-result.js';
import type { MoraAlertRunRepository } from '@/modules/alerts/domain/repositories/mora-alert-run.repository.js';

function setup(claimed: boolean) {
  const claim = vi.fn<(businessDate: string) => Promise<boolean>>(() =>
    Promise.resolve(claimed),
  );
  const finish = vi.fn<
    (businessDate: string, result: MoraAlertsResult) => Promise<void>
  >(() => Promise.resolve());
  const runs = { claim, finish } as unknown as MoraAlertRunRepository;
  const sendExecute = vi.fn(() =>
    Promise.resolve({ lendersNotified: 2, loansInMora: 3 }),
  );
  const sendMoraAlerts = {
    execute: sendExecute,
  } as unknown as SendMoraAlertsUseCase;
  return {
    useCase: new RunMoraAlertsUseCase(runs, sendMoraAlerts),
    claim,
    finish,
    sendExecute,
  };
}

describe('RunMoraAlertsUseCase', () => {
  it('el primer llamado del día envía el aviso y anota el resultado', async () => {
    const { useCase, claim, sendExecute, finish } = setup(true);

    await expect(useCase.execute('2026-10-06')).resolves.toBe(true);

    expect(claim).toHaveBeenCalledWith('2026-10-06');
    expect(sendExecute).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledWith('2026-10-06', {
      lendersNotified: 2,
      loansInMora: 3,
    });
  });

  it('si el día ya estaba reclamado, no envía nada', async () => {
    const { useCase, sendExecute, finish } = setup(false);

    await expect(useCase.execute('2026-10-06')).resolves.toBe(false);

    expect(sendExecute).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });
});
