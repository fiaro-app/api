/** A quién se le avisa de un contacto nuevo de ventas. */
export interface LeadNotificationSettings {
  /**
   * @returns La dirección de correo de ventas, o `undefined` si no está configurada: entonces no
   * se avisa a nadie (el contacto igual queda guardado).
   */
  recipientEmail(): string | undefined;
}
