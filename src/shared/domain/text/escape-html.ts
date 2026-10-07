/**
 * Escapa un texto para meterlo dentro de HTML sin que el navegador o el cliente de correo lo lea
 * como etiquetas: un nombre como `<a href="...">` se mostraría como un enlace.
 *
 * @remarks
 * El orden importa: el `&` va primero, para que las entidades que agregan los demás reemplazos no
 * se vuelvan a escapar.
 *
 * @param text - Texto que puede venir de una persona (un nombre, una nota de revisión).
 * @returns El mismo texto con `& < > " '` convertidos en entidades HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
