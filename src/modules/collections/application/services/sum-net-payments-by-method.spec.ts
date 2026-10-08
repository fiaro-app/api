import { describe, expect, it } from 'vitest';
import { sumNetPaymentsByMethod } from '@/modules/collections/application/services/sum-net-payments-by-method.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

const NOW = new Date('2026-10-07T00:00:00Z');

function paidRecord(
  id: string,
  amount: number,
  method: 'CASH' | 'NEQUI' | 'TRANSFER',
  reversed = false,
): CollectionVisitRecord {
  const visit = CollectionVisit.create({
    id,
    loanId: 'loan-1',
    collectorMembershipId: 'membership-1',
    outcome: 'PAID',
    expectedAmount: amount,
    promisedDate: null,
    occurredAt: NOW,
    createdAt: NOW,
  });
  const payment = Payment.create({
    id: `payment-${id}`,
    loanId: 'loan-1',
    visitId: id,
    amount,
    method,
    occurredAt: NOW,
    createdAt: NOW,
  });
  const reversal = reversed
    ? PaymentReversal.create({
        id: `reversal-${id}`,
        paymentId: `payment-${id}`,
        reason: 'Monto equivocado.',
        reversedByMembershipId: 'membership-2',
        createdAt: NOW,
      })
    : null;
  return { visit, payment, reversal };
}

describe('sumNetPaymentsByMethod', () => {
  it('suma cada medio por separado', () => {
    expect(
      sumNetPaymentsByMethod([
        paidRecord('v1', 10_000, 'CASH'),
        paidRecord('v2', 20_000, 'CASH'),
        paidRecord('v3', 30_000, 'NEQUI'),
        paidRecord('v4', 40_000, 'TRANSFER'),
      ]),
    ).toEqual({ CASH: 30_000, NEQUI: 30_000, TRANSFER: 40_000 });
  });

  it('un pago reversado no cuenta en su medio', () => {
    expect(
      sumNetPaymentsByMethod([paidRecord('v1', 10_000, 'CASH', true)]),
    ).toEqual({ CASH: 0, NEQUI: 0, TRANSFER: 0 });
  });

  it('una visita sin pago no suma nada', () => {
    const visit = CollectionVisit.create({
      id: 'v1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'NOT_FOUND',
      expectedAmount: 10_000,
      promisedDate: null,
      occurredAt: NOW,
      createdAt: NOW,
    });
    expect(
      sumNetPaymentsByMethod([{ visit, payment: null, reversal: null }]),
    ).toEqual({ CASH: 0, NEQUI: 0, TRANSFER: 0 });
  });

  it('una lista vacía da todo en cero', () => {
    expect(sumNetPaymentsByMethod([])).toEqual({
      CASH: 0,
      NEQUI: 0,
      TRANSFER: 0,
    });
  });
});
