import { describe, expect, it } from 'vitest';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import {
  toCollectionVisit,
  toCollectionVisitCreateInput,
  toPayment,
  toPaymentCreateInput,
} from '@/modules/collections/infrastructure/persistence/collection-visit.mapper.js';

const OCCURRED_AT = new Date('2026-10-01T14:00:00Z');
const CREATED_AT = new Date('2026-10-01T14:05:00Z');

describe('toCollectionVisitCreateInput', () => {
  it('convierte la visita en la fila de collection_visits', () => {
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

    expect(toCollectionVisitCreateInput(visit)).toEqual({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    });
  });
});

describe('toCollectionVisit', () => {
  it('convierte la fila de collection_visits en la entidad de dominio', () => {
    const row = {
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'RESCHEDULED' as const,
      expectedAmount: 30_000,
      promisedDate: '2026-10-05',
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    };

    const found = toCollectionVisit(row);

    expect(found.id).toBe('visit-1');
    expect(found.outcome).toBe('RESCHEDULED');
    expect(found.promisedDate).toBe('2026-10-05');
  });
});

describe('toPaymentCreateInput', () => {
  it('convierte el pago en la fila de payments', () => {
    const payment = Payment.create({
      id: 'payment-1',
      loanId: 'loan-1',
      visitId: 'visit-1',
      amount: 30_000,
      method: 'CASH',
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    });

    expect(toPaymentCreateInput(payment)).toEqual({
      id: 'payment-1',
      loanId: 'loan-1',
      visitId: 'visit-1',
      amount: 30_000,
      method: 'CASH',
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    });
  });
});

describe('toPayment', () => {
  it('convierte la fila de payments en la entidad de dominio', () => {
    const row = {
      id: 'payment-1',
      loanId: 'loan-1',
      visitId: 'visit-1',
      amount: 30_000,
      method: 'NEQUI' as const,
      occurredAt: OCCURRED_AT,
      createdAt: CREATED_AT,
    };

    const found = toPayment(row);

    expect(found.id).toBe('payment-1');
    expect(found.method).toBe('NEQUI');
  });
});
