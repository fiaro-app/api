import { InvalidAttachmentError } from '@/modules/attachments/domain/errors/invalid-attachment.error.js';
import {
  detectImageType,
  IMAGE_MAX_BYTES,
  imageTypeOfKey,
} from '@/shared/domain/images/image-policy.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';

/**
 * Comprueba que `key` es de verdad una foto que ESTA API dejó subir para ESTE dueño, antes de guardarla (D-145). Tres
 * pruebas obligatorias: la llave es `<prefijo>/<uuid>.<png|jpg>` (la que generó la URL firmada); el objeto existe y pesa
 * lo permitido; y sus primeros bytes son de un PNG o JPEG que coincide con la extensión y con el `Content-Type` con el que
 * se guardó. Si el archivo no es lo que dice (un SVG o un ejecutable subido con la URL firmada), se borra del bucket.
 *
 * @throws {@link InvalidAttachmentError} Si no pasa alguna prueba.
 */
export async function verifyAttachment(
  storage: ObjectStoragePort,
  prefix: string,
  key: string,
): Promise<void> {
  const expected = imageTypeOfKey(key, prefix);
  if (expected === null) {
    throw new InvalidAttachmentError(
      'La foto debe ser una subida con la URL firmada de este registro.',
    );
  }
  const info = await storage.inspectObject(key);
  if (info === null) {
    throw new InvalidAttachmentError('La foto todavía no se ha subido.');
  }
  if (
    info.sizeBytes < 1 ||
    info.sizeBytes > IMAGE_MAX_BYTES ||
    detectImageType(info.head) !== expected ||
    info.contentType !== expected
  ) {
    await storage.deleteObject(key);
    throw new InvalidAttachmentError(
      'El archivo no es un PNG o JPEG válido de hasta 5 MB.',
    );
  }
}
