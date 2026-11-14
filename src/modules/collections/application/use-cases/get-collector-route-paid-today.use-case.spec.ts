import { describe, expect, it, vi } from 'vitest';
import { GetCollectorRouteUseCase } from '@/modules/collections/application/use-cases/get-collector-route.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';

const NOW = new Date('2026-10-02T14:00:00Z');

const assignment = (loanId: string) =>
  CollectionAssignment.create({
    id: `assignment-${loanId}`,
    loanId,
    collectorMembershipId: 'membership-1',
    effectiveFrom: '2026-09-20',
    effectiveTo: null,
    createdAt: NOW,
  });

const paidToday = {
  visit: CollectionVisit.create({
    id: 'visit-1',
    loanId: 'loan-1',
    collectorMembershipId: 'membership-1',
    outcome: 'PAID',
    expectedAmount: 10_000,
    promisedDate: null,
    occurredAt: NOW,
    createdAt: NOW,
  }),
  payment: Payment.create({
    id: 'payment-1',
    loanId: 'loan-1',
    visitId: 'visit-1',
    amount: 10_000,
    method: 'CASH',
    occurredAt: NOW,
    createdAt: NOW,
  }),
  reversal: null,
};

describe('GetCollectorRouteUseCase: cobrado hoy', () => {
  it('marca lo cobrado hoy y manda al final a quien ya pagó', async () => {
    const names: Record<string, string> = {
      'client-1': 'Ana Pérez',
      'client-2': 'Zoila Zuluaga',
    };
    const useCase = new GetCollectorRouteUseCase(
      {
        findActiveByCollectorAndDate: vi.fn(() =>
          Promise.resolve([assignment('loan-1'), assignment('loan-2')]),
        ),
      } as never,
      {
        listByCollectorAndPromisedDate: vi.fn(() => Promise.resolve([])),
        listByCollectorAndDateRange: vi.fn(() => Promise.resolve([paidToday])),
      } as never,
      {
        execute: vi.fn((loanId: string) =>
          Promise.resolve({
            status: 'ACTIVE',
            clientId: loanId === 'loan-1' ? 'client-1' : 'client-2',
          }),
        ),
      } as never,
      {
        execute: vi.fn((clientId: string) =>
          Promise.resolve({ fullName: names[clientId] }),
        ),
      } as never,
      {
        execute: vi.fn(() =>
          Promise.resolve({
            balance: 50_000,
            overdueAmount: 0,
            overdueDays: 0,
            nextDueDate: null,
          }),
        ),
      } as never,
      { now: () => NOW },
    );

    const route = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: '2026-10-02',
    });

    expect(
      route.map((entry) => [entry.clientFullName, entry.collectedToday]),
    ).toEqual([
      ['Zoila Zuluaga', 0],
      ['Ana Pérez', 10_000],
    ]);
  });
});
