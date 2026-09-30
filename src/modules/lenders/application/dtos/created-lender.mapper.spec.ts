import { describe, expect, it } from 'vitest';
import { toCreatedLender } from '@/modules/lenders/application/dtos/created-lender.mapper.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

describe('toCreatedLender', () => {
  it('devuelve los datos del prestamista recién creado', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const lender = Lender.create({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt,
    });

    expect(toCreatedLender(lender)).toEqual({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt,
    });
  });
});
