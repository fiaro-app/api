/** Datos con los que se construye un {@link PushToken}. */
export interface PushTokenProps {
  /** Identificador del registro (UUIDv7). */
  readonly id: string;
  /** Token de Expo del dispositivo, con la forma `ExponentPushToken[...]`. */
  readonly token: string;
  /** La persona que tiene la sesión en ese dispositivo. */
  readonly userId: string;
  /** Cuándo se registró por primera vez en un dispositivo. */
  readonly createdAt: Date;
  /** Cuándo se volvió a registrar (la app lo hace al abrirse). */
  readonly updatedAt: Date;
}

/**
 * Dónde mandar una notificación push: el token de un dispositivo y quien lo usa (D-95). Un
 * dispositivo tiene un solo token a la vez, así que el token pertenece a la sesión que se abrió
 * en él por última vez.
 */
export class PushToken {
  private constructor(
    public readonly id: string,
    public readonly token: string,
    public readonly userId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Construye el registro con sus datos ya validados.
   *
   * @param props - Datos del token.
   */
  static create(props: PushTokenProps): PushToken {
    return new PushToken(
      props.id,
      props.token,
      props.userId,
      props.createdAt,
      props.updatedAt,
    );
  }
}
