/** Datos con los que se construye un {@link Lead}. */
export interface LeadProps {
  /** Identificador del contacto (UUIDv7). */
  readonly id: string;
  /** Nombre de quien escribe. */
  readonly name: string;
  /** Su celular en formato E.164, o `null` si dejó un correo. */
  readonly phone: string | null;
  /** Su correo, o `null` si dejó un celular. */
  readonly email: string | null;
  /** Lo que quiere contar o preguntar. */
  readonly message: string;
  /** Cuándo escribió. */
  readonly createdAt: Date;
}

/**
 * Un contacto que dejó sus datos para hablar con ventas. No pertenece a ningún negocio: es un
 * prospecto, anterior a cualquier Tenant. Siempre trae al menos un medio de contacto.
 */
export class Lead {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly phone: string | null,
    public readonly email: string | null,
    public readonly message: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye el contacto con sus datos ya validados.
   *
   * @param props - Datos del contacto.
   */
  static create(props: LeadProps): Lead {
    return new Lead(
      props.id,
      props.name,
      props.phone,
      props.email,
      props.message,
      props.createdAt,
    );
  }
}
