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
  it('compone las estadísticas, el nombre y la marca del prestamista', async () => {
    const getLenderStatsExecute = vi.fn(() => Promise.resolve(STATS));
    const getLenderExecute = vi.fn(() =>
      Promise.resolve({
        name: 'Créditos Ana',
        brandColor: '#3B3382',
        logoUrl: 'https://cdn.fiaro.test/logos/ana.png',
      } as never),
    );
    const logo = Buffer.from('png');
    const read = vi.fn(() => Promise.resolve(logo));
    const useCase = new GetLenderStatsExportUseCase(
      { execute: getLenderStatsExecute } as unknown as GetLenderStatsUseCase,
      { execute: getLenderExecute } as unknown as GetLenderUseCase,
      { read },
    );

    const result = await useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'm1',
    });

    expect(result).toEqual({
      stats: STATS,
      lenderName: 'Créditos Ana',
      brand: { color: '#3B3382', logo },
    });
    expect(read).toHaveBeenCalledExactlyOnceWith(
      'https://cdn.fiaro.test/logos/ana.png',
    );
    expect(getLenderStatsExecute).toHaveBeenCalledExactlyOnceWith(
      {
        lenderId: 'lender-1',
        collectorMembershipId: 'm1',
      },
      10,
    );
    expect(getLenderExecute).toHaveBeenCalledExactlyOnceWith('lender-1');
  });
});
