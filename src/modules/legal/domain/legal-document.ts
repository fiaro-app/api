/**
 * Lo que una persona acepta al registrarse (D-146). Cada aceptación guarda qué documento, en qué versión, cuándo, desde qué IP y
 * con qué dispositivo: es la prueba de la autorización (Ley 1581 de 2012, art. 9; Ley 527 de 1999).
 */
export const LEGAL_DOCUMENTS = [
  'TERMS',
  'PRIVACY',
  'DATA_RESPONSIBILITY',
  'MARKETING',
] as const;

/** Un documento o autorización de `LEGAL_DOCUMENTS`. */
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

/**
 * Versión vigente de los documentos legales (la fecha en que se publicó el texto). Cuando cambie un texto, se sube esta versión
 * y la web y la app muestran la nueva; quien se registre con una versión vieja recibe `P930V` y debe recargar.
 */
export const CURRENT_LEGAL_VERSION = '2026-10-16';
