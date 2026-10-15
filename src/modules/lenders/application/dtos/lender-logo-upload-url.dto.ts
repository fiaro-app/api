import type { LogoContentType } from '@/modules/lenders/domain/logo-policy.js';

/** De quién es el logo, y qué imagen va a subir. */
export interface GetLenderLogoUploadUrlInput {
  /** El prestamista con el que opera la sesión. */
  readonly lenderId: string;
  readonly contentType: LogoContentType;
  /** Peso exacto en bytes del archivo que va a subir (hasta 2 MB); la URL firmada lo exige. */
  readonly sizeBytes: number;
}
