import { describe, expect, it, vi } from 'vitest';
import { GetLenderInsightsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-insights.use-case.js';

const NOW = new Date('2026-10-15T15:00:00Z');
const LOAN = {
  id: 'loan-1',
  startDate: '2026-10-01',
  frequency: 'DAILY',
  installmentCount: 30,
  installmentValue: 10_000,
};

function setup() {
  const insights = {
    paymentsByDay: vi.fn(() =>
      Promise.resolve([
        { date: '2026-10-14', method: 'CASH', amount: 20_000, count: 2 },
      ]),
    ),
    income: vi.fn(() =>
      Promise.resolve({ collected: 20_000, interest: 4_000 }),
    ),
    originations: vi.fn(() =>
      Promise.resolve({
        loansCreated: 1,
        amountLent: 100_000,
        totalPayable: 120_000,
      }),
    ),
    visitOutcomes: vi.fn(() =>
      Promise.resolve({ PAID: 2, NOT_FOUND: 0, REFUSED: 0, RESCHEDULED: 0 }),
    ),
    settlements: vi.fn(() => Promise.resolve([])),
  };
  const listLoans = {
    execute: vi.fn(() => Promise.resolve({ items: [LOAN], total: 1 })),
  };
  const getLender = {
    execute: vi.fn(() =>
      Promise.resolve({ nonWorkingWeekdays: [], skipNationalHolidays: false }),
    ),
  };
  const useCase = new GetLenderInsightsUseCase(
    insights as never,
    listLoans as never,
    getLender as never,
    { now: () => NOW },
  );
  return { useCase, insights, listLoans };
}

describe('GetLenderInsightsUseCase', () => {
  it('por defecto mide el mes hasta hoy y compara con el tramo anterior de igual duración', async () => {
    const { useCase, insights } = setup();

    const result = await useCase.execute({ lenderId: 'lender-1' });

    expect(result.from).toBe('2026-10-01');
    expect(result.to).toBe('2026-10-15');
    expect(result.daily).toHaveLength(15);
    expect(result.previous).toMatchObject({
      from: '2026-09-16',
      to: '2026-09-30',
    });
    expect(insights.income).toHaveBeenCalledWith(
      'lender-1',
      '2026-09-16',
      '2026-09-30',
    );
  });

  it('calcula lo esperado de la serie y la proyección con el calendario de los préstamos', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      from: '2026-10-13',
      to: '2026-10-15',
    });

    expect(result.daily.map((day) => day.expected)).toEqual([
      10_000, 10_000, 10_000,
    ]);
    expect(result.daily[1]?.collected).toBe(20_000);
    expect(result.forecast.map((day) => day.expected)).toEqual(
      Array(7).fill(10_000),
    );
  });

  it('pide los préstamos abiertos al empezar, al terminar y hoy, sin repetirlos', async () => {
    const { useCase, listLoans } = setup();

    await useCase.execute({ lenderId: 'lender-1' });

    expect(listLoans.execute).toHaveBeenCalledTimes(3);
  });
});
