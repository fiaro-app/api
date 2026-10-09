import { describe, expect, it, vi } from 'vitest';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import { GetManagedCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-managed-collector-stats.use-case.js';
import type { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import { CollectorNotFoundError } from '@/modules/collections/domain/errors/collector-not-found.error.js';
import type { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';

const STATS: CollectorPeriodStats = {
  from: '2026-10-01',
  to: '2026-10-09',
  expectedAmount: 100_000,
  collectedAmount: 80_000,
  effectiveness: 0.8,
  visitsCount: 12,
  overdueAmount: 20_000,
};

function setup(roles: readonly string[] = ['COLLECTOR']) {
  const getMembership = vi.fn(() => Promise.resolve({ roles }));
  const getCollectorStats = vi.fn(() => Promise.resolve(STATS));
  const useCase = new GetManagedCollectorStatsUseCase(
    { execute: getMembership } as unknown as GetMembershipUseCase,
    { execute: getCollectorStats } as unknown as GetCollectorStatsUseCase,
  );
  return { useCase, getMembership, getCollectorStats };
}

const INPUT = {
  collectorMembershipId: 'membership-2',
  lenderId: 'lender-1',
  from: '2026-10-01',
  to: '2026-10-09',
};

describe('GetManagedCollectorStatsUseCase', () => {
  it('delega en las estadísticas del cobrador, sin recalcular nada', async () => {
    const { useCase, getMembership, getCollectorStats } = setup();

    const result = await useCase.execute(INPUT);

    expect(getMembership).toHaveBeenCalledExactlyOnceWith(
      'membership-2',
      'lender-1',
    );
    expect(getCollectorStats).toHaveBeenCalledExactlyOnceWith(INPUT);
    expect(result).toBe(STATS);
  });

  it('lanza CollectorNotFoundError si la membresía no es de un cobrador', async () => {
    const { useCase, getCollectorStats } = setup(['LENDER']);

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      CollectorNotFoundError,
    );
    expect(getCollectorStats).not.toHaveBeenCalled();
  });

  it('deja pasar el error si la membresía no existe o es de otro prestamista', async () => {
    const { useCase, getMembership, getCollectorStats } = setup();
    getMembership.mockRejectedValueOnce(
      new MembershipNotFoundError('membership-2'),
    );

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      MembershipNotFoundError,
    );
    expect(getCollectorStats).not.toHaveBeenCalled();
  });
});
