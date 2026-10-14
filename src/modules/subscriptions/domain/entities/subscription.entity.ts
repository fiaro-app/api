/** Qué plan es. Hoy solo existe la prueba con la que nace todo negocio. */
export type SubscriptionPlanCode = 'TRIAL';

/** Datos con los que se construye una {@link Subscription}. */
export interface SubscriptionProps {
  /** Identificador de la suscripción (UUIDv7). */
  readonly id: string;
  /** El Tenant al que pertenece: uno a uno. */
  readonly tenantId: string;
  readonly planCode: SubscriptionPlanCode;
  /** Cuántos prestamistas puede tener el Tenant. */
  readonly maxActiveLenders: number;
  /** Cuántos cobradores activos puede tener el negocio. */
  readonly maxCollectors: number;
  /** Hasta cuándo está pagado el período vigente. */
  readonly currentPeriodEndsAt: Date;
  /** Cuándo se creó. */
  readonly createdAt: Date;
}

/**
 * El plan del Tenant (PRODUCT.md §7). Guarda el fin del período pagado; su estado (`ACTIVE`,
 * `GRACE_PERIOD`, `READ_ONLY`) no se guarda: se calcula con `computeSubscriptionStatus`.
 */
export class Subscription {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly planCode: SubscriptionPlanCode,
    public readonly maxActiveLenders: number,
    public readonly maxCollectors: number,
    public readonly currentPeriodEndsAt: Date,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye la suscripción con sus datos ya validados.
   *
   * @param props - Datos de la suscripción.
   */
  static create(props: SubscriptionProps): Subscription {
    return new Subscription(
      props.id,
      props.tenantId,
      props.planCode,
      props.maxActiveLenders,
      props.maxCollectors,
      props.currentPeriodEndsAt,
      props.createdAt,
    );
  }
}
