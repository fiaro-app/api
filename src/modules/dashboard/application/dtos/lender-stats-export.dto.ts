import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';

/** Las estadísticas del período, con el nombre del prestamista para encabezar el PDF. */
export interface LenderStatsExport {
  readonly stats: LenderPeriodStats;
  readonly lenderName: string;
}
