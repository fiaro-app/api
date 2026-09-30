import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { LenderModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

/** @param lender - Prestamista nuevo. */
export function toLenderCreateInput(
  lender: Lender,
): Prisma.LenderUncheckedCreateInput {
  return {
    id: lender.id,
    tenantId: lender.tenantId,
    name: lender.name,
    logoUrl: lender.logoUrl,
    nonWorkingWeekdays: [...lender.nonWorkingWeekdays],
    skipNationalHolidays: lender.skipNationalHolidays,
    createdAt: lender.createdAt,
  };
}

/** @param row - Fila de `lenders`. */
export function toLender(row: LenderModel): Lender {
  return Lender.create({
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    logoUrl: row.logoUrl,
    nonWorkingWeekdays: row.nonWorkingWeekdays,
    skipNationalHolidays: row.skipNationalHolidays,
    createdAt: row.createdAt,
  });
}
