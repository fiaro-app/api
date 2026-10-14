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
  /** Si es `true`, calcula también el período anterior de la misma duración, para las tendencias. */
  readonly includePrevious?: boolean;
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

/**
 * El período anterior, de la misma duración y justo antes del pedido, con las cifras que se
 * comparan para las tendencias (D-111). La cartera y la mora son las que tenía el negocio al
 * final de ese período; lo cobrado y lo esperado, lo de sus días.
 */
export interface LenderPreviousPeriodStats {
  readonly from: string;
  readonly to: string;
  readonly totalPortfolio: number;
  readonly portfolioAtRisk: number;
  /** `null` si la cartera era cero. */
  readonly arrearsRate: number | null;
  readonly expectedAmount: number;
  readonly collectedAmount: number;
  /** `null` si no había nada esperado. */
  readonly effectiveness: number | null;
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
  /** Lo que el motor de calendario dice que vencía en el período, sumado entre los cobradores que cumplen los filtros. */
  readonly expectedAmount: number;
  /** Lo que esos cobradores cobraron de verdad en el período, sin los pagos reversados. */
  readonly collectedAmount: number;
  /** `collectedAmount / expectedAmount`, de 0 a 1. `null` si `expectedAmount` es cero. */
  readonly effectiveness: number | null;
  /** El período anterior, o `null` si no se pidió (`includePrevious`). */
  readonly previous: LenderPreviousPeriodStats | null;
}

/** Una página de una lista de las estadísticas. */
export interface LenderStatsPage<T> {
  readonly items: readonly T[];
  readonly total: number;
}

/** Entrada de `ListTopArrearsUseCase`: los mismos filtros de las estadísticas, paginados. */
export interface ListTopArrearsInput {
  readonly lenderId: string;
  readonly collectorMembershipId?: string;
  readonly portfolioId?: string;
  readonly page: number;
  readonly pageSize: number;
}

/** Entrada de `ListCollectorPerformanceUseCase`: período y cartera opcionales, paginados. */
export interface ListCollectorPerformanceInput {
  readonly lenderId: string;
  readonly from?: string;
  readonly to?: string;
  readonly portfolioId?: string;
  readonly page: number;
  readonly pageSize: number;
}
