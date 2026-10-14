import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ListCollectorPerformanceUseCase } from '@/modules/dashboard/application/use-cases/list-collector-performance.use-case.js';
import type { ListTopArrearsUseCase } from '@/modules/dashboard/application/use-cases/list-top-arrears.use-case.js';
import { LenderStatsListsController } from '@/modules/dashboard/infrastructure/controllers/lender-stats-lists.controller.js';
import { PassthroughReadCache } from '@/shared/infrastructure/cache/passthrough-read-cache.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const scopeWith = (roles: string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

function setup() {
  const topArrears = vi.fn(() =>
    Promise.resolve({
      items: [
        {
          clientId: 'c1',
          clientFullName: 'Ana',
          overdueDays: 3,
          overdueAmount: 30_000,
        },
      ],
      total: 7,
    }),
  );
  const performance = vi.fn(() => Promise.resolve({ items: [], total: 0 }));
  const controller = new LenderStatsListsController(
    { execute: topArrears } as unknown as ListTopArrearsUseCase,
    { execute: performance } as unknown as ListCollectorPerformanceUseCase,
    new PassthroughReadCache(),
  );
  return { controller, topArrears, performance };
}

describe('LenderStatsListsController', () => {
  it('pagina el ranking con los filtros y arma meta', async () => {
    const { controller, topArrears } = setup();

    const response = await controller.listTopArrears(
      { page: 2, pageSize: 5, portfolioId: 'p1' },
      scopeWith(['LENDER']),
    );

    expect(topArrears).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 5,
      portfolioId: 'p1',
    });
    expect(response.meta).toEqual({ page: 2, pageSize: 5, total: 7 });
    expect(response.data).toHaveLength(1);
  });

  it('pasa el período del desempeño como from y to', async () => {
    const { controller, performance } = setup();

    await controller.listCollectorPerformance(
      {
        page: 1,
        pageSize: 10,
        dateRange: { from: '2026-09-01', to: '2026-09-30' },
      },
      scopeWith(['OWNER']),
    );

    expect(performance).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      from: '2026-09-01',
      to: '2026-09-30',
      portfolioId: undefined,
      page: 1,
      pageSize: 10,
    });
  });

  it('un cobrador no ve las listas del negocio', async () => {
    const { controller, topArrears, performance } = setup();

    await expect(
      controller.listTopArrears(
        { page: 1, pageSize: 10 },
        scopeWith(['COLLECTOR']),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.listCollectorPerformance(
        { page: 1, pageSize: 10 },
        scopeWith(['COLLECTOR']),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(topArrears).not.toHaveBeenCalled();
    expect(performance).not.toHaveBeenCalled();
  });
});
