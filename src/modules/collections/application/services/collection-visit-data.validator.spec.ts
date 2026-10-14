import { describe, expect, it } from 'vitest';
import { validateCollectionVisitData } from '@/modules/collections/application/services/collection-visit-data.validator.js';
import { InvalidCollectionVisitDataError } from '@/modules/collections/domain/errors/invalid-collection-visit-data.error.js';

describe('validateCollectionVisitData', () => {
  it('acepta PAID con pago', () => {
    expect(() => {
      validateCollectionVisitData({
        outcome: 'PAID',
        payment: { amount: 30_000 },
      });
    }).not.toThrow();
  });

  it('acepta RESCHEDULED con promisedDate', () => {
    expect(() => {
      validateCollectionVisitData({
        outcome: 'RESCHEDULED',
        promisedDate: '2026-10-05',
      });
    }).not.toThrow();
  });

  it('acepta NOT_FOUND y REFUSED sin pago ni promisedDate', () => {
    expect(() => {
      validateCollectionVisitData({ outcome: 'NOT_FOUND' });
    }).not.toThrow();
    expect(() => {
      validateCollectionVisitData({ outcome: 'REFUSED' });
    }).not.toThrow();
  });

  it('rechaza PAID sin pago', () => {
    let error: unknown;
    try {
      validateCollectionVisitData({ outcome: 'PAID' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidCollectionVisitDataError);
    expect((error as InvalidCollectionVisitDataError).issues[0]?.path).toEqual([
      'payment',
    ]);
  });

  it('rechaza un pago fuera de PAID', () => {
    expect(() => {
      validateCollectionVisitData({
        outcome: 'NOT_FOUND',
        payment: { amount: 30_000 },
      });
    }).toThrow(InvalidCollectionVisitDataError);
  });

  it('rechaza RESCHEDULED sin promisedDate', () => {
    let error: unknown;
    try {
      validateCollectionVisitData({ outcome: 'RESCHEDULED' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidCollectionVisitDataError);
    expect((error as InvalidCollectionVisitDataError).issues[0]?.path).toEqual([
      'promisedDate',
    ]);
  });

  it('rechaza promisedDate fuera de RESCHEDULED', () => {
    expect(() => {
      validateCollectionVisitData({
        outcome: 'NOT_FOUND',
        promisedDate: '2026-10-05',
      });
    }).toThrow(InvalidCollectionVisitDataError);
  });
});
