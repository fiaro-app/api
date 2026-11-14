import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { LenderConsolidatedStatsController } from '@/modules/dashboard/infrastructure/controllers/lender-consolidated-stats.controller.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';

const FIGURES = {
  totalPortfolio: 10,
  portfolioAtRisk: 1,
  arrearsRate: 0.1,
  expectedAmount: 5,
  collectedAmount: 4,
  effectiveness: 0.8,
};
const RESULT = {
  from: '2026-11-01',
  to: '2026-11-14',
  lenders: [{ lenderId: 'a', name: 'A', ...FIGURES }],
  totals: FIGURES,
};
const USER = { id: 'user-1' } as AuthenticatedUser;

function setup() {
  const execute = vi.fn(() => Promise.resolve(RESULT));
  return {
    controller: new LenderConsolidatedStatsController({ execute } as never),
    execute,
  };
}

describe('LenderConsolidatedStatsController', () => {
  it('pide el consolidado de la persona y el negocio de la sesión, con el período', async () => {
    const { controller, execute } = setup();

    const body = await controller.getConsolidatedStats(
      { dateRange: { from: '2026-10-01', to: '2026-10-31' } },
      { membershipId: 'm', lenderId: 'a', roles: ['OWNER'] },
      USER,
    );

    expect(body).toEqual(RESULT);
    expect(execute).toHaveBeenCalledWith({
      userId: 'user-1',
      lenderId: 'a',
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('un cobrador no lo ve', async () => {
    const { controller, execute } = setup();

    await expect(
      controller.getConsolidatedStats(
        {},
        { membershipId: 'm', lenderId: 'a', roles: ['COLLECTOR'] },
        USER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(execute).not.toHaveBeenCalled();
  });
});
