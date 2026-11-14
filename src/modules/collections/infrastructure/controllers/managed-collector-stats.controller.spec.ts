import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { GetManagedCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-managed-collector-stats.use-case.js';
import { ManagedCollectorStatsController } from '@/modules/collections/infrastructure/controllers/managed-collector-stats.controller.js';
import { PassthroughReadCache } from '@/shared/infrastructure/cache/passthrough-read-cache.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const STATS = {
  from: '2026-10-01',
  to: '2026-10-09',
  expectedAmount: 100_000,
  collectedAmount: 80_000,
  effectiveness: 0.8,
  visitsCount: 12,
  overdueAmount: 20_000,
};

function setup() {
  const execute = vi.fn(() => Promise.resolve(STATS));
  const controller = new ManagedCollectorStatsController(
    { execute } as unknown as GetManagedCollectorStatsUseCase,
    new PassthroughReadCache(),
  );
  return { controller, execute };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('ManagedCollectorStatsController', () => {
  it('publica GET, colgando de collectors', () => {
    const handler = Reflect.get(
      ManagedCollectorStatsController.prototype,
      'getManagedCollectorStats',
    ) as object;
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      handler,
    ) as RequestMethod;
    expect(RequestMethod[method]).toBe('GET');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/stats');
    expect(
      Reflect.getMetadata(PATH_METADATA, ManagedCollectorStatsController),
    ).toBe('collectors');
  });

  it.each([['OWNER'], ['LENDER']])(
    'con rol %s devuelve las estadísticas del cobrador pedido',
    async (role) => {
      const { controller, execute } = setup();

      const response = await controller.getManagedCollectorStats(
        'membership-2',
        { from: '2026-10-01', to: '2026-10-09' },
        scopeWith([role]),
      );

      expect(execute).toHaveBeenCalledExactlyOnceWith({
        collectorMembershipId: 'membership-2',
        lenderId: 'lender-1',
        from: '2026-10-01',
        to: '2026-10-09',
      });
      expect(response).toEqual(STATS);
    },
  );

  it('sin período deja que el caso de uso use el mes actual', async () => {
    const { controller, execute } = setup();

    await controller.getManagedCollectorStats(
      'membership-2',
      {},
      scopeWith(['OWNER']),
    );

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ from: undefined, to: undefined }),
    );
  });

  it('rechaza con 403 a quien solo es COLLECTOR', async () => {
    const { controller, execute } = setup();

    await expect(
      controller.getManagedCollectorStats(
        'membership-1',
        {},
        scopeWith(['COLLECTOR']),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(execute).not.toHaveBeenCalled();
  });
});
