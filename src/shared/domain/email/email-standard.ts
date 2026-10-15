/**
 * Estándar de los correos de Fiaro (D-131). Los límites salen de las pautas de Gmail y de Resend (ver
 * `EMAIL-PUSH-STANDARD.md`): están aquí como constantes para que el mismo número lo usen la
 * plantilla y la prueba que revisa todos los correos.
 */

/** Marca que abre todos los asuntos: quien recibe sabe de quién es antes de abrirlo. */
export const EMAIL_SUBJECT_PREFIX = 'Fiaro: ';

/** Asuntos de hasta 60 caracteres: los clientes de correo cortan hacia ahí y un asunto largo parece spam. */
export const EMAIL_SUBJECT_MAX = 60;

/** Gmail recorta los mensajes de más de 102 KB; se deja un margen amplio, un correo de Fiaro es mucho menor. */
export const EMAIL_HTML_MAX_BYTES = 30_000;

/** Colores de marca de los correos: texto casi negro sobre blanco (contraste 16:1) y el índigo de Fiaro de acento (9:1 con texto blanco). */
export const EMAIL_COLORS = {
  background: '#ffffff',
  text: '#1c1b2e',
  muted: '#5b5870',
  accent: '#3b3382',
  accentText: '#ffffff',
  line: '#e4e2ef',
  highlight: '#f6f5fb',
} as const;

/**
 * Arma el asunto de un correo: una sola línea (sin saltos que inyecten cabeceras), con la marca por
 * delante y recortado a {@link EMAIL_SUBJECT_MAX}.
 *
 * @param title - Lo que dice el correo, en una frase corta y sin mayúsculas sostenidas ni signos de exclamación.
 */
export function emailSubject(title: string): string {
  const oneLine = title.replaceAll(/\s+/g, ' ').trim();
  const subject = `${EMAIL_SUBJECT_PREFIX}${oneLine}`;
  return subject.length <= EMAIL_SUBJECT_MAX
    ? subject
    : `${subject.slice(0, EMAIL_SUBJECT_MAX - 1).trimEnd()}…`;
}
