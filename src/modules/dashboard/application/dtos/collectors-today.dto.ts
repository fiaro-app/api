import type { RouteStatus } from '@/modules/dashboard/domain/route-status.js';

/** Cómo va la ruta de hoy de un cobrador activo. */
export interface CollectorTodayProgress {
  readonly membershipId: string;
  readonly fullName: string;
  readonly status: RouteStatus;
  /** Préstamos en su ruta de hoy. */
  readonly routeLoans: number;
  /** De esos, cuántos ya visitó. */
  readonly visitedLoans: number;
  /** Cuántos le faltan por visitar. */
  readonly pendingLoans: number;
  /** Lo que se esperaba cobrar hoy. */
  readonly expectedAmount: number;
  /** Lo que ya cobró hoy (sin reversiones). */
  readonly collectedAmount: number;
  /** Cuándo registró su primera visita de hoy; `null` si no ha empezado. */
  readonly firstVisitAt: Date | null;
  /** Cuándo registró la última; `null` si no ha empezado. */
  readonly lastVisitAt: Date | null;
  /** Estado del cuadre que envió hoy, o `null` si todavía no lo envía. */
  readonly settlementStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

/** El avance de las rutas de hoy de todos los cobradores activos. */
export interface CollectorsToday {
  readonly date: string;
  /** Cuántos cobradores activos hay en cada estado. */
  readonly counts: Readonly<Record<RouteStatus, number>>;
  /** Primero los que no han empezado, luego los que van en marcha. */
  readonly collectors: readonly CollectorTodayProgress[];
}
