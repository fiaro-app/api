import { InvalidLenderLogoError } from '@/modules/lenders/domain/errors/invalid-lender-logo.error.js';
import {
  detectLogoType,
  LOGO_MAX_BYTES,
  logoTypeOfKey,
} from '@/modules/lenders/domain/logo-policy.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';

/**
 * Comprueba que `logoUrl` es de verdad un logo que ESTA API dejó subir para ESTE prestamista, antes
 * de guardarlo (D-132). Cuatro pruebas, todas obligatorias:
 *
 * 1. La URL es de nuestro bucket (nada de otro dominio, esquemas raros ni rastreadores).
 * 2. La llave es `logos/<este prestamista>/<id>.<png|jpg>`: la que generó `logo-upload-url`.
 * 3. El objeto existe y pesa lo permitido.
 * 4. Sus primeros bytes son de un PNG o JPEG que coincide con la extensión, y se guardó con ese
 *    `Content-Type`. Si no lo es (alguien subió un SVG o un ejecutable con la URL firmada), el
 *    objeto se borra del bucket y se rechaza.
 *
 * @param storage - El bucket.
 * @param lenderId - El prestamista que guarda el logo.
 * @param logoUrl - La URL que quiere guardar.
 * @throws {@link InvalidLenderLogoError} Si no pasa alguna prueba.
 */
export async function verifyLogo(
  storage: ObjectStoragePort,
  lenderId: string,
  logoUrl: string,
): Promise<void> {
  const key = storage.keyFromPublicUrl(logoUrl);
  const expected = key === null ? null : logoTypeOfKey(lenderId, key);
  if (key === null || expected === null) {
    throw new InvalidLenderLogoError(
      'El logo debe ser uno subido con la URL firmada de este negocio.',
    );
  }
  const info = await storage.inspectObject(key);
  if (info === null) {
    throw new InvalidLenderLogoError('El logo todavía no se ha subido.');
  }
  if (
    info.sizeBytes < 1 ||
    info.sizeBytes > LOGO_MAX_BYTES ||
    detectLogoType(info.head) !== expected ||
    info.contentType !== expected
  ) {
    await storage.deleteObject(key);
    throw new InvalidLenderLogoError(
      'El archivo no es un PNG o JPEG válido de hasta 2 MB.',
    );
  }
}
