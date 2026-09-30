/** Datos con los que se construye un {@link Client}. */
export interface ClientProps {
  /** Identificador del cliente (UUIDv7). */
  readonly id: string;
  /** El prestamista dueño de este cliente. */
  readonly lenderId: string;
  /** Cédula de ciudadanía, sin separadores: la llave para detectar un cliente existente. */
  readonly nationalId: string;
  /** Nombre completo. */
  readonly fullName: string;
  /** Oficio del cliente. */
  readonly occupation: string;
  /** Celular o fijo colombiano en formato E.164. */
  readonly phone: string;
  /** Dirección de residencia o de cobro. */
  readonly address: string;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/**
 * Persona deudora. No es usuario del sistema (PRODUCT.md §5): aislada por `lenderId`, con
 * `nationalId` único dentro de su prestamista, no en todo el sistema.
 */
export class Client {
  private constructor(
    public readonly id: string,
    public readonly lenderId: string,
    public readonly nationalId: string,
    public readonly fullName: string,
    public readonly occupation: string,
    public readonly phone: string,
    public readonly address: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye al cliente con sus datos ya validados.
   *
   * @param props - Datos del cliente.
   */
  static create(props: ClientProps): Client {
    return new Client(
      props.id,
      props.lenderId,
      props.nationalId,
      props.fullName,
      props.occupation,
      props.phone,
      props.address,
      props.createdAt,
    );
  }
}
