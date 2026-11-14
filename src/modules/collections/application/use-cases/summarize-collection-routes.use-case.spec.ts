import { describe, expect, it, vi } from 'vitest';
import { SummarizeCollectionRoutesUseCase } from '@/modules/collections/application/use-cases/summarize-collection-routes.use-case.js';
import type {
  CollectionVisitReportRepository,
  RouteDaySummary,
} from '@/modules/collections/domain/repositories/collection-visit-report.repository.js';

const day = (date: string, name: string): RouteDaySummary => ({
  date,
  collectorMembershipId: `m-${name}`,
  collectorFullName: name,
  startedAt: new Date(`${date}T13:00:00Z`),
  endedAt: new Date(`${date}T21:00:00Z`),
  visitsCount: 4,
  paidCount: 3,
  expectedAmount: 120_000,
  collectedAmount: 90_000,
});

function setup(days: readonly RouteDaySummary[]) {
  const summarizeRoutes = vi.fn(() => Promise.resolve(days));
  const report = {
    search: vi.fn(),
    summarizeRoutes,
  } as unknown as CollectionVisitReportRepository;
  return {
    useCase: new SummarizeCollectionRoutesUseCase(report, {
      now: () => new Date('2026-10-14T20:00:00Z'),
    }),
    summarizeRoutes,
  };
}

describe('SummarizeCollectionRoutesUseCase', () => {
  it('sin rango consulta solo hoy, en hora de Bogotá', async () => {
    const { useCase, summarizeRoutes } = setup([]);

    const result = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 10,
    });

    expect(summarizeRoutes).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      from: '2026-10-14',
      to: '2026-10-14',
      collectorMembershipId: undefined,
      portfolioId: undefined,
    });
    expect(result).toEqual({
      from: '2026-10-14',
      to: '2026-10-14',
      total: 0,
      items: [],
    });
  });

  it('pasa el rango y los filtros, y pagina en memoria', async () => {
    const days = [
      day('2026-10-14', 'Ana'),
      day('2026-10-14', 'Luis'),
      day('2026-10-13', 'Ana'),
    ];
    const { useCase, summarizeRoutes } = setup(days);

    const result = await useCase.execute({
      lenderId: 'lender-1',
      from: '2026-10-13',
      to: '2026-10-14',
      collectorMembershipId: 'm-Ana',
      portfolioId: 'portfolio-1',
      page: 2,
      pageSize: 2,
    });

    expect(summarizeRoutes).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-10-13',
        to: '2026-10-14',
        collectorMembershipId: 'm-Ana',
        portfolioId: 'portfolio-1',
      }),
    );
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      date: '2026-10-13',
      collector: { membershipId: 'm-Ana', fullName: 'Ana' },
      visitsCount: 4,
      collectedAmount: 90_000,
    });
  });
});
