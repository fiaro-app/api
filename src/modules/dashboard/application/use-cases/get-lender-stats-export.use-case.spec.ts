import { describe, expect, it, vi } from 'vitest';
import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import { GetLenderStatsExportUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats-export.use-case.js';
import type { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';

const STATS = {
  from: '2026-10-01',
  to: '2026-10-07',
} as unknown as LenderPeriodStats;

describe('GetLenderStatsExportUseCase', () => {
  it('compone las estadísticas y el nombre del prestamista', async () => {
    const getLenderStatsExecute = vi.fn(() => Promise.resolve(STATS));
    const getLenderExecute = vi.fn(() =>
      Promise.resolve({ name: 'Créditos Ana' } as never),
    );
    const useCase = new GetLenderStatsExportUseCase(
      { execute: getLenderStatsExecute } as unknown as GetLenderStatsUseCase,
      { execute: getLenderExecute } as unknown as GetLenderUseCase,
    );

    const result = await useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'm1',
    });

    expect(result).toEqual({ stats: STATS, lenderName: 'Créditos Ana' });
    expect(getLenderStatsExecute).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      collectorMembershipId: 'm1',
    });
    expect(getLenderExecute).toHaveBeenCalledExactlyOnceWith('lender-1');
  });
});
