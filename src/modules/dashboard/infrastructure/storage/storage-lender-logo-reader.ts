import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LenderLogoReader } from '@/modules/dashboard/application/ports/lender-logo-reader.port.js';
import type { ObjectStoragePort } from '@/shared/application/ports/object-storage.port.js';
import { OBJECT_STORAGE } from '@/shared/application/ports/object-storage.token.js';

/** El logo pesa a lo sumo 2 MB al subirse (D-102); se pide un poco más por si acaso. */
const MAX_LOGO_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

/** @param bytes - Los primeros bytes de un archivo. @param signature - Los de un formato. */
function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * {@link LenderLogoReader} que baja el logo de NUESTRO bucket con una URL firmada de lectura.
 *
 * @remarks
 * Solo lee URLs que `keyFromPublicUrl` reconoce como de este bucket: el logo es una URL que escribe
 * el cliente (`PATCH /lender`), y bajar cualquier otra sería una puerta a pedirle al servidor que
 * visite direcciones internas (SSRF). Reconoce el formato por sus primeros bytes, no por lo que diga
 * el servidor, porque `pdfkit` solo dibuja PNG y JPEG.
 */
@Injectable()
export class StorageLenderLogoReader implements LenderLogoReader {
  private readonly logger = new Logger(StorageLenderLogoReader.name);

  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  async read(logoUrl: string | null): Promise<Buffer | null> {
    const key =
      logoUrl === null ? null : this.storage.keyFromPublicUrl(logoUrl);
    if (key === null) {
      return null;
    }
    try {
      const url = await this.storage.getPresignedDownloadUrl(key, 60);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        return null;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const isImage =
        startsWith(bytes, PNG_SIGNATURE) || startsWith(bytes, JPEG_SIGNATURE);
      return isImage && bytes.length <= MAX_LOGO_BYTES ? bytes : null;
    } catch (error) {
      this.logger.warn(`No se pudo leer el logo del PDF: ${String(error)}.`);
      return null;
    }
  }
}
