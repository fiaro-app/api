import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DailySettlementController } from '@/modules/settlements/infrastructure/controllers/daily-settlement.controller.js';

function setup() {
  const cancel = { execute: vi.fn(() => Promise.resolve()) };
  const controller = new DailySettlementController(
    {} as never,
    cancel as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { controller, cancel };
}

describe('DailySettlementController.cancelSettlement', () => {
  it('un cobrador cancela su propio cuadre', async () => {
    const { controller, cancel } = setup();

    await controller.cancelSettlement('settlement-1', {
      membershipId: 'membership-1',
      lenderId: 'lender-1',
      roles: ['COLLECTOR'],
    });

    expect(cancel.execute).toHaveBeenCalledWith({
      settlementId: 'settlement-1',
      lenderId: 'lender-1',
      collectorMembershipId: 'membership-1',
    });
  });

  it('quien solo administra recibe 403', async () => {
    const { controller, cancel } = setup();

    await expect(
      controller.cancelSettlement('settlement-1', {
        membershipId: 'm',
        lenderId: 'lender-1',
        roles: ['OWNER'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(cancel.execute).not.toHaveBeenCalled();
  });
});
