import type { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

/** Datos con los que se construye una {@link User}. */
export interface UserProps {
  /** Identificador de la persona (UUIDv7). */
  readonly id: string;
  /** Celular, ya validado como móvil colombiano. */
  readonly phone: MobilePhone;
  /** Nombre completo. */
  readonly fullName: string;
  /** Correo real de la persona, opcional: el login es por celular (D-07). */
  readonly contactEmail: string | null;
  /** Cédula de ciudadanía; obligatoria para los cobradores, no para quien registra su negocio. */
  readonly nationalId: string | null;
  /** La contraseña actual es temporal y debe reemplazarse en el primer ingreso. */
  readonly mustChangePassword: boolean;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/**
 * Persona que inicia sesión. Hay una sola cuenta por persona, identificada por su celular.
 * No tiene rol propio: sus roles vienen de cada membresía con un prestamista (D-02).
 */
export class User {
  private constructor(
    public readonly id: string,
    public readonly phone: MobilePhone,
    public readonly fullName: string,
    public readonly contactEmail: string | null,
    public readonly nationalId: string | null,
    public readonly mustChangePassword: boolean,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye a la persona con sus datos ya validados.
   *
   * @param props - Datos de la persona.
   */
  static create(props: UserProps): User {
    return new User(
      props.id,
      props.phone,
      props.fullName,
      props.contactEmail,
      props.nationalId,
      props.mustChangePassword,
      props.createdAt,
    );
  }
}
