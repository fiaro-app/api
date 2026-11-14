import type { LegalDocument } from '@/modules/legal/domain/legal-document.js';

/** Una aceptación lista para guardar. */
export interface NewLegalAcceptance {
  readonly id: string;
  readonly userId: string;
  readonly document: LegalDocument;
  readonly version: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/** Puerto de las aceptaciones legales. */
export interface LegalAcceptanceRepository {
  /** Guarda todas las aceptaciones juntas o ninguna. @param rows - Las aceptaciones. */
  recordMany(rows: readonly NewLegalAcceptance[]): Promise<void>;
}
