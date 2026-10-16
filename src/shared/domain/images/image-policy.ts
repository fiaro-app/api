/**
 * Lista blanca de las fotos privadas (fotos de clientes y comprobantes de pago, D-145): lo único que se acepta, en un
 * solo lugar para que la URL firmada, la llave y la verificación del archivo digan lo mismo. Igual que el logo (D-132),
 * sin SVG, GIF ni WebP: un SVG puede llevar scripts.
 */

/** Tipos de imagen permitidos. */
export const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg'] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

/** Extensión de la llave de cada tipo permitido. */
export const IMAGE_EXTENSION: Record<ImageContentType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** Peso máximo de una foto: 5 MB (una foto de celular comprimida pesa unos cientos de KB). */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

/**
 * Reconoce el tipo real de un archivo por sus primeros bytes, sin fiarse del tipo que declaró quien lo subió.
 *
 * @param head - Los primeros bytes del archivo.
 * @returns `image/png`, `image/jpeg`, o `null` si no es ninguno.
 */
export function detectImageType(head: Uint8Array): ImageContentType | null {
  if (startsWith(head, PNG_SIGNATURE)) {
    return 'image/png';
  }
  return startsWith(head, JPEG_SIGNATURE) ? 'image/jpeg' : null;
}

/**
 * @param key - La llave de un objeto en el bucket.
 * @param prefix - La carpeta y los ids que la llave debe llevar antes del nombre (`client-photos/<lender>/<client>`).
 * @returns El tipo que dice la llave si es de la forma `<prefix>/<uuid>.<png|jpg>`, o `null` si no (otra carpeta, otro
 * dueño, un nombre que nadie le dio o `..` para salirse).
 */
export function imageTypeOfKey(
  key: string,
  prefix: string,
): ImageContentType | null {
  if (!key.startsWith(`${prefix}/`)) {
    return null;
  }
  const match = /^[0-9a-f-]{36}\.(png|jpg)$/.exec(key.slice(prefix.length + 1));
  if (match === null) {
    return null;
  }
  return match[1] === 'png' ? 'image/png' : 'image/jpeg';
}
