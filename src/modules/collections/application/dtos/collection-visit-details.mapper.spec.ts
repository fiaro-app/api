import { describe, expect, it } from 'vitest';
import { toCollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.mapper.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';

const OCCURRED_AT = new Date('2026-10-01T14:00:00Z');
const CREATED_AT = new Date('2026-10-01T14:05:00Z');

describe('toCollectionVisitDetails', () => {
  it('convierte una visita sin pago, con payment en null', () => {
    const visit = CollectionVisit.create({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'NOT_FOUND',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    });

    expect(toCollectionVisitDetails({ visit, payment: null })).toEqual({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'NOT_FOUND',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
      payment: null,
    });
  });

  it('convierte una visita PAID con su pago', () => {
    const visit = CollectionVisit.create({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    });
    const payment = Payment.create({
      id: 'payment-1',
      loanId: 'loan-1',
      visitId: 'visit-1',
      amount: 30_000,
      method: 'CASH',
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    });

    expect(toCollectionVisitDetails({ visit, payment })).toEqual({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
      payment: {
        id: 'payment-1',
        loanId: 'loan-1',
        visitId: 'visit-1',
        amount: 30_000,
        method: 'CASH',
        occurredAt: OCCURRED_AT,
        createdAt: CREATED_AT,
      },
    });
  });
});
