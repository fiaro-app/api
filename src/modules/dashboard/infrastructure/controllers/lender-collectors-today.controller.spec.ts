import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { LenderCollectorsTodayController } from '@/modules/dashboard/infrastructure/controllers/lender-collectors-today.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const TODAY = {
  date: '2026-10-15',
  counts: { NO_ROUTE: 0, NOT_STARTED: 1, IN_PROGRESS: 0, FINISHED: 0 },
  collectors: [
    {
      membershipId: '0198f8e0-0000-7000-8000-000000000001',
      fullName: 'Ana',
      status: 'NOT_STARTED' as const,
      routeLoans: 4,
      visitedLoans: 0,
      pendingLoans: 4,
      expectedAmount: 100_000,
      collectedAmount: 0,
      firstVisitAt: null,
      lastVisitAt: new Date('2026-10-15T14:30:00Z'),
      settlementStatus: null,
    },
  ],
};

function setup() {
  const execute = vi.fn(() => Promise.resolve(TODAY));
  const cache = {
    getOrLoad: vi.fn(
      (_lender: string, _key: string, _ttl: number, load: () => unknown) =>
        load(),
    ),
  };
  const controller = new LenderCollectorsTodayController(
    { execute } as never,
    cache as never,
  );
  return { controller, execute, cache };
}

const scope = (roles: string[]): LenderScope => ({
  membershipId: 'm1',
  lenderId: 'lender-1',
  roles,
});

describe('LenderCollectorsTodayController', () => {
  it('devuelve el avance de hoy con las fechas en ISO, por la caché del prestamista', async () => {
    const { controller, execute, cache } = setup();

    const response = await controller.getCollectorsTodayProgress(
      scope(['OWNER']),
    );

    expect(execute).toHaveBeenCalledWith('lender-1');
    expect(cache.getOrLoad).toHaveBeenCalledWith(
      'lender-1',
      expect.any(String),
      expect.any(Number),
      expect.any(Function),
    );
    expect(response.collectors[0]).toMatchObject({
      fullName: 'Ana',
      lastVisitAt: '2026-10-15T14:30:00.000Z',
      firstVisitAt: null,
    });
  });

  it('un cobrador que no administra recibe 403', async () => {
    const { controller, execute } = setup();

    await expect(
      controller.getCollectorsTodayProgress(scope(['COLLECTOR'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(execute).not.toHaveBeenCalled();
  });
});
