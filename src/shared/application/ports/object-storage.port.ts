/** Una URL firmada de subida, y la URL pública del objeto una vez subido. */
export interface PresignedUpload {
  readonly uploadUrl: string;
  readonly publicUrl: string;
  /** Cuándo deja de servir `uploadUrl` (D-102). */
  readonly expiresAt: Date;
}

/** Lo que el bucket dice de un objeto ya subido, más sus primeros bytes para reconocer qué archivo es. */
export interface StoredObjectInfo {
  /** Tamaño real en bytes. */
  readonly sizeBytes: number;
  /** El `Content-Type` con el que quedó guardado. */
  readonly contentType: string | undefined;
  /** Los primeros bytes (hasta 16): bastan para la firma de PNG o JPEG. */
  readonly head: Uint8Array;
}

/**
 * Subida de archivos a un bucket S3/R2 (D-102): el archivo va directo del dispositivo al bucket,
 * nunca por la API. Puerto genérico, sin nada de `lenders`: cada caso de uso decide la llave, el
 * tipo de contenido y el tamaño que acepta.
 */
export interface ObjectStoragePort {
  /**
   * @param key - Ruta del objeto dentro del bucket.
   * @param upload - El tipo de contenido y el tamaño exactos que la URL firma: la subida debe
   * declarar los mismos o el bucket la rechaza.
   */
  getPresignedUploadUrl(
    key: string,
    upload: { readonly contentType: string; readonly sizeBytes: number },
  ): Promise<PresignedUpload>;

  /**
   * @param key - Ruta del objeto.
   * @returns Lo que el bucket dice del objeto, o `null` si no existe.
   */
  inspectObject(key: string): Promise<StoredObjectInfo | null>;

  /** Borra el objeto (no falla si no existe). @param key - Ruta del objeto. */
  deleteObject(key: string): Promise<void>;

  /**
   * @param url - Una URL pública.
   * @returns La llave del objeto si la URL es de ESTE bucket, o `null` si apunta a cualquier otro
   * lado (otro dominio, otro bucket, otro esquema).
   */
  keyFromPublicUrl(url: string): string | null;

  /**
   * Una URL firmada de lectura, para archivos que no son públicos (fotos de clientes, comprobantes):
   * quien la tiene puede verlo hasta que vence, y nadie más.
   *
   * @param key - Ruta del objeto.
   * @param ttlSeconds - Cuánto sirve la URL.
   */
  getPresignedDownloadUrl(key: string, ttlSeconds: number): Promise<string>;
}
