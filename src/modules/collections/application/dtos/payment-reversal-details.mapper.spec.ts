import { describe, expect, it } from 'vitest';
import { toPaymentReversalDetails } from '@/modules/collections/application/dtos/payment-reversal-details.mapper.js';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';

describe('toPaymentReversalDetails', () => {
  it('devuelve los datos públicos de la reversión', () => {
    const createdAt = new Date('2026-10-01T14:05:00Z');
    const reversal = PaymentReversal.create({
      id: 'reversal-1',
      paymentId: 'payment-1',
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-1',
      createdAt,
    });

    expect(toPaymentReversalDetails(reversal)).toEqual({
      id: 'reversal-1',
      paymentId: 'payment-1',
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-1',
      createdAt,
    });
  });
});
