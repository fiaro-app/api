/**
 * Lista blanca del logo del prestamista (D-132): lo único que se acepta, en un solo lugar para que
 * la URL firmada, el cuerpo de la petición y la verificación del archivo digan lo mismo.
 */

/** Tipos de imagen permitidos. SVG, GIF, WebP y el resto quedan fuera a propósito: el SVG puede llevar scripts. */
export const LOGO_CONTENT_TYPES = ['image/png', 'image/jpeg'] as const;
export type LogoContentType = (typeof LOGO_CONTENT_TYPES)[number];

/** Extensión de la llave de cada tipo permitido. */
export const LOGO_EXTENSION: Record<LogoContentType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** Peso máximo de un logo: 2 MB. Un logo de verdad pesa decenas de KB. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

/**
 * Reconoce el tipo real de un archivo por sus primeros bytes (la «firma»), sin fiarse del tipo que
 * declaró quien lo subió ni de su extensión.
 *
 * @param head - Los primeros bytes del archivo.
 * @returns `image/png`, `image/jpeg`, o `null` si no es ninguno (un SVG, un HTML, un ejecutable…).
 */
export function detectLogoType(head: Uint8Array): LogoContentType | null {
  if (startsWith(head, PNG_SIGNATURE)) {
    return 'image/png';
  }
  return startsWith(head, JPEG_SIGNATURE) ? 'image/jpeg' : null;
}

/**
 * @param lenderId - El prestamista dueño del logo.
 * @param key - La llave de un objeto en el bucket.
 * @returns El tipo que dice la llave si es una llave que esta API generó para ese prestamista
 * (`logos/<lenderId>/<uuid>.<png|jpg>`), o `null` si no: otra carpeta, otro prestamista, un nombre
 * que nadie le dio o `..` para salirse.
 */
export function logoTypeOfKey(
  lenderId: string,
  key: string,
): LogoContentType | null {
  const match = /^logos\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(png|jpg)$/.exec(key);
  if (match?.[1] !== lenderId) {
    return null;
  }
  return match[2] === 'png' ? 'image/png' : 'image/jpeg';
}
