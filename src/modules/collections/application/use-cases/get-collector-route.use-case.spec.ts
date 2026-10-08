import { describe, expect, it, vi } from 'vitest';
import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import type { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import { GetCollectorRouteUseCase } from '@/modules/collections/application/use-cases/get-collector-route.use-case.js';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-02T14:00:00Z');
const CREATED_AT = new Date('2026-09-20T00:00:00Z');

function loan(
  id: string,
  clientId: string,
  status: LoanDetails['status'],
): LoanDetails {
  return {
    id,
    clientId,
    principalAmount: 100_000,
    installmentCount: 10,
    installmentValue: 10_000,
    totalPayable: 100_000,
    frequency: 'DAILY',
    startDate: '2026-09-20',
    status,
    createdByMembershipId: 'membership-owner',
    createdAt: CREATED_AT,
    closedAt: null,
  };
}

function client(id: string, fullName: string): ClientDetails {
  return {
    id,
    nationalId: '123456',
    fullName,
    occupation: 'Comerciante',
    phone: '+573001112233',
    address: 'Calle falsa 123',
    createdAt: CREATED_AT,
  };
}

function setup(
  options: {
    assigned?: readonly CollectionAssignment[];
    promised?: readonly CollectionVisit[];
    loans?: Record<string, LoanDetails>;
    clients?: Record<string, ClientDetails>;
  } = {},
) {
  const findActiveByCollectorAndDate = vi.fn(() =>
    Promise.resolve(options.assigned ?? []),
  );
  const assignments: CollectionAssignmentRepository = {
    listOpenByCollector: vi.fn(() => Promise.resolve([])),
    reassign: vi.fn(() => Promise.resolve()),
    create: vi.fn(),
    findOpenByLoan: vi.fn(),
    listByLoan: vi.fn(),
    findActiveByCollectorAndDate,
    update: vi.fn(),
  };
  const listByCollectorAndPromisedDate = vi.fn(() =>
    Promise.resolve(options.promised ?? []),
  );
  const visits: CollectionVisitRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    listByLoan: vi.fn(),
    listByCollectorAndPromisedDate,
  };
  const loans = options.loans ?? {};
  const getLoanExecute = vi.fn((loanId: string) => {
    const found = loans[loanId];
    return found
      ? Promise.resolve(found)
      : Promise.reject(new Error('no usado'));
  });
  const getLoan = { execute: getLoanExecute } as unknown as GetLoanUseCase;
  const clients = options.clients ?? {};
  const getClientExecute = vi.fn((clientId: string) =>
    Promise.resolve(clients[clientId]),
  );
  const getClient = {
    execute: getClientExecute,
  } as unknown as GetClientUseCase;
  const getLoanBalanceExecute = vi.fn((loanId: string) =>
    Promise.resolve({
      loanId,
      asOf: '2026-10-02',
      balance: 50_000,
      totalExpectedToDate: 50_000,
      overdueAmount: 10_000,
      overdueDays: 2,
      nextDueDate: '2026-10-03',
      firstOverdueDate: '2026-10-01',
    }),
  );
  const getLoanBalance = {
    execute: getLoanBalanceExecute,
  } as unknown as GetLoanBalanceUseCase;
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new GetCollectorRouteUseCase(
      assignments,
      visits,
      getLoan,
      getClient,
      getLoanBalance,
      clock,
    ),
    findActiveByCollectorAndDate,
    listByCollectorAndPromisedDate,
    getLoanExecute,
    getLoanBalanceExecute,
  };
}

describe('GetCollectorRouteUseCase', () => {
  it('usa la fecha de hoy cuando no llega una', async () => {
    const {
      useCase,
      findActiveByCollectorAndDate,
      listByCollectorAndPromisedDate,
    } = setup();

    await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
    });

    expect(findActiveByCollectorAndDate).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      '2026-10-02',
    );
    expect(listByCollectorAndPromisedDate).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      '2026-10-02',
    );
  });

  it('arma una fila por préstamo activo, con el cliente y el saldo', async () => {
    const assignment = CollectionAssignment.create({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-09-20',
      effectiveTo: null,
      createdAt: CREATED_AT,
    });
    const { useCase } = setup({
      assigned: [assignment],
      loans: { 'loan-1': loan('loan-1', 'client-1', 'ACTIVE') },
      clients: { 'client-1': client('client-1', 'Carlos Deudor') },
    });

    const route = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: '2026-10-02',
    });

    expect(route).toEqual([
      {
        loanId: 'loan-1',
        clientId: 'client-1',
        clientFullName: 'Carlos Deudor',
        balance: 50_000,
        overdueAmount: 10_000,
        overdueDays: 2,
        nextDueDate: '2026-10-03',
      },
    ]);
  });

  it('une lo asignado y lo prometido sin duplicar el mismo préstamo', async () => {
    const assignment = CollectionAssignment.create({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-09-20',
      effectiveTo: null,
      createdAt: CREATED_AT,
    });
    const promise = CollectionVisit.create({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'RESCHEDULED',
      expectedAmount: 10_000,
      promisedDate: '2026-10-02',
      occurredAt: CREATED_AT,
      createdAt: CREATED_AT,
    });
    const { useCase, getLoanExecute } = setup({
      assigned: [assignment],
      promised: [promise],
      loans: { 'loan-1': loan('loan-1', 'client-1', 'ACTIVE') },
      clients: { 'client-1': client('client-1', 'Carlos Deudor') },
    });

    const route = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: '2026-10-02',
    });

    expect(route).toHaveLength(1);
    expect(getLoanExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
    );
  });

  it('deja afuera un préstamo que ya no está ACTIVE', async () => {
    const assignment = CollectionAssignment.create({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-09-20',
      effectiveTo: null,
      createdAt: CREATED_AT,
    });
    const { useCase, getLoanBalanceExecute } = setup({
      assigned: [assignment],
      loans: { 'loan-1': loan('loan-1', 'client-1', 'PAID_OFF') },
    });

    const route = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: '2026-10-02',
    });

    expect(route).toEqual([]);
    expect(getLoanBalanceExecute).not.toHaveBeenCalled();
  });

  it('ordena por nombre de cliente', async () => {
    const assignments = [
      CollectionAssignment.create({
        id: 'assignment-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-09-20',
        effectiveTo: null,
        createdAt: CREATED_AT,
      }),
      CollectionAssignment.create({
        id: 'assignment-2',
        loanId: 'loan-2',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-09-20',
        effectiveTo: null,
        createdAt: CREATED_AT,
      }),
    ];
    const { useCase } = setup({
      assigned: assignments,
      loans: {
        'loan-1': loan('loan-1', 'client-1', 'ACTIVE'),
        'loan-2': loan('loan-2', 'client-2', 'ACTIVE'),
      },
      clients: {
        'client-1': client('client-1', 'Zoila Zuluaga'),
        'client-2': client('client-2', 'Ana Pérez'),
      },
    });

    const route = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: '2026-10-02',
    });

    expect(route.map((entry) => entry.clientFullName)).toEqual([
      'Ana Pérez',
      'Zoila Zuluaga',
    ]);
  });
});
