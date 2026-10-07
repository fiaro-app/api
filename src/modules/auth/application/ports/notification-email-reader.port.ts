/**
 * Dice a qué correo se le puede mandar una notificación a una persona (D-94). Lo decide `auth`,
 * porque es quien sabe si el correo es de la persona (D-69) y si su cuenta sigue activa (D-71).
 */
export interface NotificationEmailReader {
  /**
   * @param userId - La persona que recibe la notificación.
   * @returns Su correo de contacto, solo si lo verificó y su cuenta no está desactivada; si no,
   * `null`.
   */
  findVerifiedContactEmail(userId: string): Promise<string | null>;
}
