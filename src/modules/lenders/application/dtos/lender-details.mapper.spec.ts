import { describe, expect, it } from 'vitest';
import { toLenderDetails } from '@/modules/lenders/application/dtos/lender-details.mapper.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

describe('toLenderDetails', () => {
  it('devuelve los datos públicos del prestamista', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const lender = Lender.create({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: 'https://example.com/logo.png',
      brandColor: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: true,
      createdAt,
    });

    expect(toLenderDetails(lender)).toEqual({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: 'https://example.com/logo.png',
      brandColor: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: true,
      createdAt,
    });
  });
});
