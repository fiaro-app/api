import type { SubscriptionPlanCode } from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import type { SubscriptionStatus } from '@/shared/domain/subscriptions/subscription-status.js';

/** La suscripción de un negocio, con su estado y su uso, en el momento en que se consultó. */
export interface SubscriptionDetails {
  readonly planCode: SubscriptionPlanCode;
  readonly status: SubscriptionStatus;
  /** Hasta cuándo está pagado el período vigente. */
  readonly currentPeriodEndsAt: Date;
  /** Fin del período más los días de gracia: desde ahí es solo lectura. */
  readonly graceEndsAt: Date;
  /** Días enteros que faltan para el fin del período; cero si ya venció. */
  readonly daysRemaining: number;
  /** Días enteros de gracia que quedan; cero fuera de la gracia. */
  readonly graceDaysRemaining: number;
  /** Si el negocio está en solo lectura: pasó la gracia. */
  readonly isReadOnly: boolean;
  readonly limits: {
    readonly maxActiveLenders: number;
    readonly maxCollectors: number;
    readonly maxAdmins: number;
    readonly maxPortfolios: number;
    /** `null` si el plan no limita los préstamos activos. */
    readonly maxActiveLoans: number | null;
  };
  readonly usage: {
    /** Prestamistas del negocio. */
    readonly activeLenders: number;
    /** Cobradores activos del prestamista con el que opera la sesión. */
    readonly activeCollectors: number;
    /** Administradores activos del prestamista de la sesión; la dueña cuenta. */
    readonly activeAdmins: number;
    /** Préstamos activos del prestamista de la sesión. */
    readonly activeLoans: number;
  };
  readonly createdAt: Date;
}
