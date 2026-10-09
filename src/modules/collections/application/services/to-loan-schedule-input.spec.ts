import { describe, expect, it } from 'vitest';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { toLoanScheduleInput } from '@/modules/collections/application/services/to-loan-schedule-input.js';

const LOAN: LoanDetails = {
  id: 'loan-1',
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY',
  startDate: '2026-10-01',
  status: 'ACTIVE',
  createdByMembershipId: 'membership-1',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  closedAt: null,
};

const LENDER: LenderDetails = {
  id: 'lender-1',
  tenantId: 'tenant-1',
  name: 'Créditos de prueba',
  logoUrl: null,
  brandColor: null,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  createdAt: new Date('2026-09-01T00:00:00Z'),
};

describe('toLoanScheduleInput', () => {
  it('toma la frecuencia y las cuotas del préstamo, y los días sin cobro del prestamista', () => {
    expect(toLoanScheduleInput(LOAN, LENDER)).toEqual({
      startDate: '2026-10-01',
      frequency: 'DAILY',
      installmentCount: 20,
      installmentValue: 30_000,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
    });
  });
});
