import { DEFAULT_PORTFOLIO_NAME } from '@fiaro-app/contracts';
import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { LenderModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';

/**
 * La fila de `lenders` y su cartera "General" por defecto. Prisma las inserta en una sola
 * transacción, igual que `toUserCreateInput` inserta a la persona y su credencial juntas.
 *
 * @param lender - Prestamista nuevo.
 * @param defaultPortfolioId - Identificador de la fila de la cartera por defecto.
 */
export function toLenderCreateInput(
  lender: Lender,
  defaultPortfolioId: string,
): Prisma.LenderUncheckedCreateInput {
  return {
    id: lender.id,
    tenantId: lender.tenantId,
    name: lender.name,
    logoUrl: lender.logoUrl,
    nonWorkingWeekdays: [...lender.nonWorkingWeekdays],
    skipNationalHolidays: lender.skipNationalHolidays,
    createdAt: lender.createdAt,
    portfolios: {
      create: {
        id: defaultPortfolioId,
        name: DEFAULT_PORTFOLIO_NAME,
        isDefault: true,
        createdAt: lender.createdAt,
      },
    },
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
