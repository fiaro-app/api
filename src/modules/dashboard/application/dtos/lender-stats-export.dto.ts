import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';

/** La marca del negocio en el PDF (D-151). */
export interface PdfBrand {
  /** Color de marca `#RRGGBB`, o `null` para uno neutro. */
  readonly color: string | null;
  /** El logo (PNG o JPEG), o `null` si no tiene o no se pudo leer. */
  readonly logo: Buffer | null;
}

/** Las estadísticas del período, con el nombre y la marca del prestamista para encabezar el PDF. */
export interface LenderStatsExport {
  readonly stats: LenderPeriodStats;
  readonly lenderName: string;
  readonly brand: PdfBrand;
}
