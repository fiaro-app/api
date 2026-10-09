import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

/** @param lender - El prestamista. */
export function toLenderDetails(lender: Lender): LenderDetails {
  return {
    id: lender.id,
    tenantId: lender.tenantId,
    name: lender.name,
    logoUrl: lender.logoUrl,
    brandColor: lender.brandColor,
    nonWorkingWeekdays: lender.nonWorkingWeekdays,
    skipNationalHolidays: lender.skipNationalHolidays,
    createdAt: lender.createdAt,
  };
}
