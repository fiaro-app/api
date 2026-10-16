import { CURRENT_LEGAL_VERSION } from '@/modules/legal/domain/legal-document.js';

/** Las aceptaciones legales que `POST /register` exige: lo que mandaría una persona que marcó las tres casillas. */
export const LEGAL_ACCEPTANCE = {
  acceptedTerms: true,
  acceptedPrivacy: true,
  acceptedDataResponsibility: true,
  marketingConsent: false,
  legalVersion: CURRENT_LEGAL_VERSION,
} as const;
