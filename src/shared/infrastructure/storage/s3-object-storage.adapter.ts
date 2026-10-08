import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  ObjectStoragePort,
  PresignedUpload,
} from '@/shared/application/ports/object-storage.port.js';

/** Cuánto dura una URL firmada de subida antes de dejar de servir (D-102). */
const PRESIGNED_URL_TTL_SECONDS = 300;

/** Lo mínimo para hablar con el bucket: mismas credenciales en Cloudflare R2 y en SeaweedFS. */
export interface S3Config {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly publicUrlBase: string;
}

/**
 * Sube archivos a un bucket S3 (D-102): Cloudflare R2 en producción, el SeaweedFS de
 * `pnpm docker:dev`/`pnpm docker:infra` en desarrollo (ARCHITECTURE.md, "Almacenamiento S3").
 *
 * @remarks
 * `forcePathStyle: true` y `region: 'auto'` son los que le dan paridad a R2 y a SeaweedFS con el
 * mismo cliente; `requestChecksumCalculation`/`responseChecksumValidation: 'WHEN_REQUIRED'` es lo
 * que Cloudflare recomienda para el SDK de AWS v3 contra R2. Nunca se conecta en el constructor:
 * `S3Client` solo guarda la configuración, y una URL firmada se calcula por criptografía, sin red
 * — por eso generarla no falla aunque el bucket esté caído.
 *
 * `contentType` no queda parte de lo firmado: `getSignedUrl` de una `PutObjectCommand` solo firma
 * `host` por defecto (verificado), así que quien sube puede mandar cualquier byte bajo esa llave.
 * `contentType` solo decide si la API accede a firmar la URL (el caso de uso valida que sea PNG o
 * JPEG antes de llegar aquí) — no es una garantía de qué contenido termina en el bucket. Para eso
 * haría falta una subida por POST con política de condiciones, que es más código del que esta
 * pieza (D-102) necesita.
 */
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });
    return {
      uploadUrl,
      publicUrl: `${this.config.publicUrlBase}/${key}`,
      expiresAt: new Date(Date.now() + PRESIGNED_URL_TTL_SECONDS * 1000),
    };
  }
}
