import { describe, expect, it } from 'vitest';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import { toLenderResponse } from '@/modules/lenders/infrastructure/controllers/schemas/lender-responses.schema.js';

describe('toLenderResponse', () => {
  it('convierte la fecha a texto ISO y el arreglo de solo lectura a uno mutable', () => {
    const details: LenderDetails = {
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt: new Date('2026-09-30T00:00:00Z'),
    };

    expect(toLenderResponse(details)).toEqual({
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt: '2026-09-30T00:00:00.000Z',
    });
  });
});
