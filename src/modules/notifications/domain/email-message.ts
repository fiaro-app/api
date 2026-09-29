/**
 * Un correo listo para enviar. Lleva las dos versiones del cuerpo (`html` y `text`) porque
 * generar una a partir de la otra es una fuente de errores sutiles (etiquetas que quedan en el
 * texto plano, saltos de línea que se pierden en el HTML): quien arma el mensaje decide las dos.
 */
export interface EmailMessage {
  /** Dirección del destinatario. */
  readonly to: string;
  /** Asunto del correo. */
  readonly subject: string;
  /** Cuerpo en HTML. */
  readonly html: string;
  /** Cuerpo en texto plano, para clientes que no muestran HTML. */
  readonly text: string;
}
