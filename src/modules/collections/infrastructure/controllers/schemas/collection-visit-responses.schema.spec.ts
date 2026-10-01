import { describe, expect, it } from 'vitest';
import type { CollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.dto.js';
import {
  toCollectionVisitResponse,
  toCollectionVisitsResponse,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-responses.schema.js';

const OCCURRED_AT = new Date('2026-10-01T14:00:00Z');
const CREATED_AT = new Date('2026-10-01T14:05:00Z');

const DETAILS: CollectionVisitDetails = {
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
};

describe('toCollectionVisitResponse', () => {
  it('convierte las fechas a texto ISO, con el pago anidado', () => {
    expect(toCollectionVisitResponse(DETAILS)).toEqual({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: '2026-10-01T14:00:00.000Z',
      createdAt: '2026-10-01T14:05:00.000Z',
      payment: {
        id: 'payment-1',
        loanId: 'loan-1',
        visitId: 'visit-1',
        amount: 30_000,
        method: 'CASH',
        occurredAt: '2026-10-01T14:00:00.000Z',
        createdAt: '2026-10-01T14:05:00.000Z',
      },
    });
  });

  it('deja payment en null si outcome no fue PAID', () => {
    expect(
      toCollectionVisitResponse({
        ...DETAILS,
        outcome: 'NOT_FOUND',
        payment: null,
      }),
    ).toMatchObject({ payment: null });
  });
});

describe('toCollectionVisitsResponse', () => {
  it('convierte cada visita de la lista', () => {
    expect(toCollectionVisitsResponse([DETAILS])).toHaveLength(1);
  });

  it('convierte una lista vacía en una lista vacía', () => {
    expect(toCollectionVisitsResponse([])).toEqual([]);
  });
});
