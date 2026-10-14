/** Una URL firmada de subida, y la URL pública del objeto una vez subido. */
export interface PresignedUpload {
  readonly uploadUrl: string;
  readonly publicUrl: string;
  /** Cuándo deja de servir `uploadUrl` (D-102). */
  readonly expiresAt: Date;
}

/**
 * Subida de archivos a un bucket S3/R2 (D-102): el archivo va directo del dispositivo al bucket,
 * nunca por la API. Puerto genérico, sin nada de `lenders`: cada caso de uso decide la llave y el
 * tipo de contenido que acepta.
 */
export interface ObjectStoragePort {
  /**
   * @param key - Ruta del objeto dentro del bucket.
   * @param contentType - El tipo de contenido que la URL firma; la subida debe declarar el mismo.
   */
  getPresignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<PresignedUpload>;
}
