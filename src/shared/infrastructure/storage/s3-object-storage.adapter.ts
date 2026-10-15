import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  ObjectStoragePort,
  PresignedUpload,
  StoredObjectInfo,
} from '@/shared/application/ports/object-storage.port.js';

/** Cuánto dura una URL firmada de subida antes de dejar de servir (D-102). */
const PRESIGNED_URL_TTL_SECONDS = 300;

/** Cuántos bytes del inicio se leen para reconocer el tipo de archivo. */
const HEAD_BYTES = 16;

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
 * `getSignedUrl` de una `PutObjectCommand` solo firma `host` por defecto (verificado): por eso se
 * piden firmados también `content-type` y `content-length` (`signableHeaders`). Así el bucket
 * rechaza (403) una subida con otro tipo o de otro tamaño que el declarado al pedir la URL. Se usa
 * PUT firmado y no POST con política de condiciones porque Cloudflare R2 no soporta POST firmado.
 * Aun así, quien sube controla los bytes: lo que garantiza qué archivo es lo comprueba
 * `inspectObject` (firma del archivo) antes de que el logo se guarde en el prestamista.
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
    upload: { readonly contentType: string; readonly sizeBytes: number },
  ): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: upload.contentType,
      ContentLength: upload.sizeBytes,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
    return {
      uploadUrl,
      publicUrl: `${this.config.publicUrlBase}/${key}`,
      expiresAt: new Date(Date.now() + PRESIGNED_URL_TTL_SECONDS * 1000),
    };
  }

  async inspectObject(key: string): Promise<StoredObjectInfo | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Range: `bytes=0-${String(HEAD_BYTES - 1)}`,
        }),
      );
      const total = /\/(\d+)$/.exec(response.ContentRange ?? '')?.[1];
      return {
        sizeBytes:
          total === undefined ? (response.ContentLength ?? 0) : Number(total),
        contentType: response.ContentType,
        head: (await response.Body?.transformToByteArray()) ?? new Uint8Array(),
      };
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  keyFromPublicUrl(url: string): string | null {
    const prefix = `${this.config.publicUrlBase}/`;
    return url.startsWith(prefix) && url.length > prefix.length
      ? url.slice(prefix.length)
      : null;
  }
}
