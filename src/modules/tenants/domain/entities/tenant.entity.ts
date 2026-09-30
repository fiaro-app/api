/** Datos con los que se construye un {@link Tenant}. */
export interface TenantProps {
  /** Identificador del Tenant (UUIDv7). */
  readonly id: string;
  /** Nombre del negocio. */
  readonly name: string;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/**
 * Dueño del negocio como cliente de Fiaro: raíz de la facturación. Puede tener uno o varios
 * prestamistas (`Lender`); en el MVP el registro crea el Tenant y su primer Lender juntos (1:1),
 * PRODUCT.md §5.
 */
export class Tenant {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye al Tenant con sus datos ya validados.
   *
   * @param props - Datos del Tenant.
   */
  static create(props: TenantProps): Tenant {
    return new Tenant(props.id, props.name, props.createdAt);
  }
}
