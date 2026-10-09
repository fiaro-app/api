/** Datos con los que se construye un {@link Portfolio}. */
export interface PortfolioProps {
  /** Identificador de la cartera (UUIDv7). */
  readonly id: string;
  /** El prestamista dueño de esta cartera. */
  readonly lenderId: string;
  /** Nombre de la cartera; único dentro del prestamista. */
  readonly name: string;
  /** La cartera por defecto ("General") no se puede eliminar. */
  readonly isDefault: boolean;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/**
 * Cartera o zona ("Zona Norte"): agrupa cobradores y, a través de ellos, clientes y préstamos.
 * Es opcional para el negocio: si nadie crea otra, todo queda en la cartera "General"
 * (PRODUCT.md §5).
 */
export class Portfolio {
  private constructor(
    public readonly id: string,
    public readonly lenderId: string,
    public readonly name: string,
    public readonly isDefault: boolean,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye a la cartera con sus datos ya validados.
   *
   * @param props - Datos de la cartera.
   */
  static create(props: PortfolioProps): Portfolio {
    return new Portfolio(
      props.id,
      props.lenderId,
      props.name,
      props.isDefault,
      props.createdAt,
    );
  }

  /**
   * @param name - El nombre nuevo, ya validado.
   * @returns La misma cartera con otro nombre; la cartera original no cambia.
   */
  rename(name: string): Portfolio {
    return new Portfolio(
      this.id,
      this.lenderId,
      name,
      this.isDefault,
      this.createdAt,
    );
  }
}
