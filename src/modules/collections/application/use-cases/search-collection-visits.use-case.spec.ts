import { describe, expect, it, vi } from 'vitest';
import { SearchCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/search-collection-visits.use-case.js';
import type {
  CollectionVisitReportPage,
  CollectionVisitReportRepository,
} from '@/modules/collections/domain/repositories/collection-visit-report.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-09T23:30:00-05:00'); // 2026-10-09 en Bogotá (04:30 UTC del 10)

const PAGE: CollectionVisitReportPage = {
  total: 1,
  items: [
    {
      visitId: 'visit-1',
      occurredAt: NOW,
      outcome: 'PAID',
      expectedAmount: 10_000,
      promisedDate: null,
      loanId: 'loan-1',
      clientId: 'client-1',
      clientFullName: 'Carlos Ramírez',
      collectorMembershipId: 'membership-1',
      collectorFullName: 'Ana Cobradora',
      payment: {
        id: 'payment-1',
        amount: 10_000,
        method: 'NEQUI',
        reversed: false,
      },
    },
  ],
};

function setup() {
  const search = vi.fn(() => Promise.resolve(PAGE));
  const report: CollectionVisitReportRepository = {
    search,
    summarizeRoutes: vi.fn(),
  };
  const clock: Clock = { now: () => NOW };
  return { useCase: new SearchCollectionVisitsUseCase(report, clock), search };
}

describe('SearchCollectionVisitsUseCase', () => {
  it('sin rango consulta solo hoy, en hora de Bogotá', async () => {
    const { useCase, search } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
    });

    expect(search).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      from: '2026-10-09',
      to: '2026-10-09',
      collectorMembershipId: undefined,
      portfolioId: undefined,
      outcome: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(result.from).toBe('2026-10-09');
    expect(result.to).toBe('2026-10-09');
  });

  it('pasa el rango, los filtros y la paginación tal como llegan', async () => {
    const { useCase, search } = setup();

    await useCase.execute({
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-07',
      collectorMembershipId: 'membership-1',
      portfolioId: 'portfolio-1',
      outcome: 'PAID',
      page: 3,
      pageSize: 50,
    });

    expect(search).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-07',
      collectorMembershipId: 'membership-1',
      portfolioId: 'portfolio-1',
      outcome: 'PAID',
      page: 3,
      pageSize: 50,
    });
  });

  it('agrupa el préstamo, el cliente y el cobrador de cada fila', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual({
      visitId: 'visit-1',
      occurredAt: NOW,
      outcome: 'PAID',
      expectedAmount: 10_000,
      promisedDate: null,
      loan: { id: 'loan-1' },
      client: { id: 'client-1', fullName: 'Carlos Ramírez' },
      collector: { membershipId: 'membership-1', fullName: 'Ana Cobradora' },
      payment: {
        id: 'payment-1',
        amount: 10_000,
        method: 'NEQUI',
        reversed: false,
      },
    });
  });
});
