/**
 * Lo que `notifications` necesita saber de quien recibe una notificación, sin leer la tabla de
 * usuarios (D-94, D-95). Lo decide `auth`, porque es quien sabe si el correo es de la persona
 * (D-69) y si su cuenta sigue activa (D-71).
 */
export interface NotificationRecipient {
  /** El correo de contacto, solo si la persona lo verificó; si no, `null`. */
  readonly verifiedEmail: string | null;
}

/** Lee a quién se le puede mandar una notificación. */
export interface NotificationRecipientReader {
  /**
   * @param userId - La persona que recibe la notificación.
   * @returns Lo que se le puede mandar, o `null` si la cuenta no existe o está desactivada: a una
   * cuenta así no le llega nada, ni correo ni push.
   */
  findRecipient(userId: string): Promise<NotificationRecipient | null>;
}
