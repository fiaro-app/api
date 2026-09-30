import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import type { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

/** @param lender - El prestamista recién creado. */
export function toCreatedLender(lender: Lender): CreatedLender {
  return {
    id: lender.id,
    tenantId: lender.tenantId,
    name: lender.name,
    logoUrl: lender.logoUrl,
    nonWorkingWeekdays: lender.nonWorkingWeekdays,
    skipNationalHolidays: lender.skipNationalHolidays,
    createdAt: lender.createdAt,
  };
}
