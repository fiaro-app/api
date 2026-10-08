import type { ArrearsBucket } from '@/modules/dashboard/domain/arrears-stats.js';

/** Qué período y filtros se piden, y de qué prestamista. */
export interface GetLenderStatsInput {
  /** El prestamista con el que opera la sesión. */
  readonly lenderId: string;
  /** Primera fecha del rango (`AAAA-MM-DD`); por defecto, el primer día del mes actual. */
  readonly from?: string;
  /** Última fecha del rango (`AAAA-MM-DD`); por defecto, hoy. */
  readonly to?: string;
  /** Solo los préstamos que este cobrador tiene asignados hoy; ausente para todos. */
  readonly collectorMembershipId?: string;
  /** Solo los cobradores de esta cartera, y los préstamos que tienen asignados hoy; ausente para todas. */
  readonly portfolioId?: string;
}

/** Un cliente en el ranking de mayor mora, con su nombre ya resuelto. */
export interface LenderStatsTopArrearsEntry {
  readonly clientId: string;
  readonly clientFullName: string;
  readonly overdueDays: number;
  readonly overdueAmount: number;
}

/** El desempeño de un cobrador en el período, para el ranking del Lender. */
export interface LenderStatsCollectorPerformance {
  readonly collectorMembershipId: string;
  readonly fullName: string;
  /** `collectedAmount / expectedAmount` del período, de 0 a 1. `null` si no había nada esperado. */
  readonly effectiveness: number | null;
  /** Lo vencido y sin pagar hoy, de los préstamos que tiene asignados. */
  readonly overdueAmount: number;
}

/** La salud de cartera y mora del negocio en un período (PROTOTIPO-FLUJOS.md §4.9, D-100). */
export interface LenderPeriodStats {
  readonly from: string;
  readonly to: string;
  /** Suma del saldo de los préstamos `ACTIVE` que cumplen los filtros. */
  readonly totalPortfolio: number;
  /** Suma del saldo de los que, además, tienen algo vencido sin pagar hoy. */
  readonly portfolioAtRisk: number;
  /** `portfolioAtRisk / totalPortfolio`, de 0 a 1. `null` si `totalPortfolio` es cero. */
  readonly arrearsRate: number | null;
  /** Los 4 buckets fijos de antigüedad de mora, siempre en el mismo orden. */
  readonly arrearsByAge: readonly ArrearsBucket[];
  /** Los clientes con mayor mora, descendente por días y luego por monto. */
  readonly topArrears: readonly LenderStatsTopArrearsEntry[];
  /** El desempeño de cada cobrador que cumple los filtros. */
  readonly collectorPerformance: readonly LenderStatsCollectorPerformance[];
}
