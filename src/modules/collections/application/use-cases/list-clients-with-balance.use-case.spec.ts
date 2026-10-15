import { describe, expect, it, vi } from 'vitest';
import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import type { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { ListActiveLoansByClientsUseCase } from '@/modules/loans/application/use-cases/list-active-loans-by-clients.use-case.js';
import { ListClientsWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-clients-with-balance.use-case.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-09-27T12:00:00-05:00');

const client = (id: string) =>
  ({ id, fullName: `Cliente ${id}` }) as ClientDetails;

const loan = (id: string, clientId: string, startDate = '2026-09-24') => ({
  id,
  clientId,
  startDate,
  frequency: 'DAILY',
  installmentCount: 5,
  installmentValue: 10_000,
  totalPayable: 50_000,
  status: 'ACTIVE',
  closedAt: null,
});

const paidRecord = (loanId: string, amount: number): CollectionVisitRecord => ({
  visit: CollectionVisit.create({
    id: `visit-${loanId}`,
    loanId,
    collectorMembershipId: 'membership-1',
    outcome: 'PAID',
    expectedAmount: 10_000,
    promisedDate: null,
    occurredAt: NOW,
    createdAt: NOW,
  }),
  payment: Payment.create({
    id: `payment-${loanId}`,
    loanId,
    visitId: `visit-${loanId}`,
    amount,
    method: 'CASH',
    occurredAt: NOW,
    createdAt: NOW,
  }),
  reversal: null,
});

function setup(options: {
  clients?: readonly ClientDetails[];
  loans?: readonly ReturnType<typeof loan>[];
  records?: readonly CollectionVisitRecord[];
}) {
  const clients = options.clients ?? [client('c1'), client('c2')];
  const listClients = vi.fn(() =>
    Promise.resolve({ items: clients, total: 17 }),
  );
  const listActiveLoansByClients = vi.fn(() =>
    Promise.resolve(options.loans ?? []),
  );
  const getLender = vi.fn(() =>
    Promise.resolve({
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
    }),
  );
  const listVisitRecordsByLoans = vi.fn(() =>
    Promise.resolve(options.records ?? []),
  );
  const listClientIdsByCollector = vi.fn(() => Promise.resolve(['c1']));
  const clock: Clock = { now: () => NOW };
  const useCase = new ListClientsWithBalanceUseCase(
    { execute: listClients } as unknown as ListClientsUseCase,
    {
      execute: listActiveLoansByClients,
    } as unknown as ListActiveLoansByClientsUseCase,
    { execute: getLender } as unknown as GetLenderUseCase,
    {
      listVisitRecordsByLoans,
      listClientIdsByCollector,
    } as unknown as LoanPortfolioReadRepository,
    clock,
  );
  return {
    useCase,
    listClients,
    listClientIdsByCollector,
    listActiveLoansByClients,
    getLender,
    listVisitRecordsByLoans,
  };
}

const INPUT = { lenderId: 'lender-1', page: 1, pageSize: 20 };

describe('ListClientsWithBalanceUseCase', () => {
  it('con un cobrador, solo pide los clientes con préstamos asignados a él', async () => {
    const { useCase, listClients, listClientIdsByCollector } = setup({});

    await useCase.execute({ ...INPUT, collectorMembershipId: 'membership-1' });

    expect(listClientIdsByCollector).toHaveBeenCalledWith(
      'membership-1',
      '2026-09-27',
    );
    expect(listClients).toHaveBeenCalledWith({ ...INPUT, ids: ['c1'] });
  });

  it('sin cobrador no filtra por clientes', async () => {
    const { useCase, listClients, listClientIdsByCollector } = setup({});

    await useCase.execute(INPUT);

    expect(listClientIdsByCollector).not.toHaveBeenCalled();
    expect(listClients).toHaveBeenCalledWith({ ...INPUT, ids: undefined });
  });

  it('suma el saldo y la mora de los préstamos activos de cada cliente', async () => {
    const { useCase } = setup({
      loans: [
        loan('l1', 'c1'),
        loan('l2', 'c1'),
        loan('l3', 'c2', '2026-10-05'), // todavía no arranca: sin mora
      ],
      records: [paidRecord('l1', 30_000)],
    });

    const page = await useCase.execute(INPUT);

    expect(page.total).toBe(17);
    const [c1, c2] = page.items;
    expect(c1).toMatchObject({
      activeLoans: 2,
      // Vencían el 25 y el 26 (el 27 es domingo): 20.000. l1 pagó 30.000, así que queda al día con
      // 20.000 de saldo; l2 no pagó nada: 50.000 de saldo y 20.000 de mora.
      balance: 70_000,
      overdueAmount: 20_000,
    });
    expect(c1?.overdueDays).toBeGreaterThan(0);
    expect(c2).toMatchObject({
      activeLoans: 1,
      balance: 50_000,
      overdueAmount: 0,
      overdueDays: 0,
    });
  });

  it('un cliente sin préstamos activos queda en cero', async () => {
    const { useCase } = setup({ loans: [loan('l1', 'c1')] });

    const page = await useCase.execute(INPUT);

    expect(page.items[1]).toMatchObject({
      client: { id: 'c2' },
      balance: 0,
      overdueAmount: 0,
      overdueDays: 0,
      activeLoans: 0,
    });
  });

  it('pide los préstamos de toda la página en una consulta, y las visitas de todos ellos en otra', async () => {
    const {
      useCase,
      listActiveLoansByClients,
      getLender,
      listVisitRecordsByLoans,
    } = setup({ loans: [loan('l1', 'c1'), loan('l2', 'c2')] });

    await useCase.execute(INPUT);

    expect(listActiveLoansByClients).toHaveBeenCalledExactlyOnceWith(
      'lender-1',
      ['c1', 'c2'],
    );
    expect(getLender).toHaveBeenCalledExactlyOnceWith('lender-1');
    expect(listVisitRecordsByLoans).toHaveBeenCalledExactlyOnceWith([
      'l1',
      'l2',
    ]);
  });

  it('una página vacía no consulta nada más', async () => {
    const { useCase, listActiveLoansByClients } = setup({ clients: [] });

    const page = await useCase.execute(INPUT);

    expect(page).toEqual({ items: [], total: 17 });
    expect(listActiveLoansByClients).not.toHaveBeenCalled();
  });
});
