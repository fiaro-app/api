/** Lee el logo de un prestamista para ponerlo en un documento (el PDF de estadísticas, D-151). */
export interface LenderLogoReader {
  /**
   * @param logoUrl - La URL pública del logo guardada en el prestamista, o `null` si no tiene.
   * @returns Los bytes de la imagen (PNG o JPEG), o `null` si no tiene logo, no es de nuestro
   * almacenamiento, no se pudo leer a tiempo o no es una imagen que el PDF acepte. Nunca falla: un
   * logo que no se pueda leer no debe impedir descargar el reporte.
   */
  read(logoUrl: string | null): Promise<Buffer | null>;
}
