/** Los dos tipos de imagen que acepta el logo (PROTOTIPO-FLUJOS.md §4.9). */
export type LogoContentType = 'image/png' | 'image/jpeg';

/** De quién es el logo, y qué tipo de imagen va a subir. */
export interface GetLenderLogoUploadUrlInput {
  /** El prestamista con el que opera la sesión. */
  readonly lenderId: string;
  readonly contentType: LogoContentType;
}
