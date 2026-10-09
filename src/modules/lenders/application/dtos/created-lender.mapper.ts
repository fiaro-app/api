import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import type { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

/**
 * @param lender - El prestamista recién creado.
 * @param defaultPortfolioId - Identificador de su cartera "General" por defecto.
 */
export function toCreatedLender(
  lender: Lender,
  defaultPortfolioId: string,
): CreatedLender {
  return {
    id: lender.id,
    tenantId: lender.tenantId,
    name: lender.name,
    logoUrl: lender.logoUrl,
    brandColor: lender.brandColor,
    nonWorkingWeekdays: lender.nonWorkingWeekdays,
    skipNationalHolidays: lender.skipNationalHolidays,
    defaultPortfolioId,
    createdAt: lender.createdAt,
  };
}
