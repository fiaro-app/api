/** Los planes que existen: la prueba con la que nace todo negocio y los tres de pago (PRODUCT.md §7). */
export const SUBSCRIPTION_PLAN_CODES = [
  'TRIAL',
  'INDIVIDUAL',
  'PRO',
  'TEAM',
] as const;

/** Código de un plan de {@link SUBSCRIPTION_PLAN_CODES}. */
export type SubscriptionPlanCode = (typeof SUBSCRIPTION_PLAN_CODES)[number];

/** Los topes de un plan. Solo los préstamos activos admiten `null` («sin tope»); el resto lleva un tope técnico. */
export interface PlanLimits {
  /** Prestamistas (negocios) que puede tener el Tenant. */
  readonly maxActiveLenders: number;
  /** Administradores por prestamista. */
  readonly maxAdmins: number;
  /** Cobradores activos por prestamista, sin contar a la dueña. */
  readonly maxCollectors: number;
  /** Carteras por prestamista, la «General» incluida. */
  readonly maxPortfolios: number;
  /** Préstamos activos por prestamista. */
  readonly maxActiveLoans: number | null;
}

/** Tope técnico de «cobradores ilimitados»: mantiene la columna numérica y protege el sistema. */
export const UNLIMITED_COLLECTORS = 1000;

/**
 * Límites de cada plan (D-144). Se copian a la suscripción al contratarla, así que cambiar este
 * catálogo no mueve a quienes ya pagan.
 *
 * shortcut: `TRIAL` fija aquí admins/carteras/préstamos y toma prestamistas y cobradores de las
 * variables `SUBSCRIPTION_TRIAL_*`; los precios no viven en el código hasta que exista el cobro.
 */
export const PLAN_CATALOG: Readonly<Record<SubscriptionPlanCode, PlanLimits>> =
  {
    TRIAL: {
      maxActiveLenders: 1,
      maxAdmins: 3,
      maxCollectors: 5,
      maxPortfolios: 4,
      maxActiveLoans: null,
    },
    INDIVIDUAL: {
      maxActiveLenders: 1,
      maxAdmins: 1,
      maxCollectors: 2,
      maxPortfolios: 2,
      maxActiveLoans: 20,
    },
    PRO: {
      maxActiveLenders: 1,
      maxAdmins: 3,
      maxCollectors: 10,
      maxPortfolios: 4,
      maxActiveLoans: null,
    },
    TEAM: {
      maxActiveLenders: 3,
      maxAdmins: 3,
      maxCollectors: UNLIMITED_COLLECTORS,
      maxPortfolios: 10,
      maxActiveLoans: null,
    },
  };
