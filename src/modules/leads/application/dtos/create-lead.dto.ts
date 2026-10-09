/** Datos con los que alguien pide hablar con ventas. */
export interface CreateLeadInput {
  /** Nombre de quien escribe. */
  readonly name: string;
  /** Celular, con o sin indicativo ni separadores; ausente si dejó un correo. */
  readonly phone?: string;
  /** Correo; ausente si dejó un celular. */
  readonly email?: string;
  /** Lo que quiere contar o preguntar. */
  readonly message: string;
}
