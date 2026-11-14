/** Cada cuánto se cobra una cuota: los mismos valores que `LoanFrequency` de `loans`. */
export const IMPORT_FREQUENCIES = [
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
] as const;

/** Una frecuencia de {@link IMPORT_FREQUENCIES}. */
export type ImportFrequency = (typeof IMPORT_FREQUENCIES)[number];

/** Cuántas filas admite una petición: cada fila es unos 330 bytes de JSON y el cuerpo admite 100 KB. */
export const IMPORT_MAX_ROWS = 200;

/** El préstamo en curso de una fila: solo lo que falta (D-152). */
export interface ImportLoanInput {
  /** Cuotas que faltan por cobrar. */
  readonly remainingInstallments: number;
  /** Valor de cada cuota, en pesos. */
  readonly installmentValue: number;
  readonly frequency: ImportFrequency;
  /** Fecha `AAAA-MM-DD` de la próxima cuota. */
  readonly nextInstallmentDate: string;
  /** Capital que falta, si se sabe; sin él se toma lo que falta por pagar (sin interés). */
  readonly pendingCapital?: number | null;
  /** Celular del cobrador al que se le asigna; sin él el préstamo queda sin asignar. */
  readonly collectorPhone?: string | null;
}

/** Una fila de la hoja: un cliente y, si lo tiene, su préstamo en curso. */
export interface ImportRowInput {
  readonly nationalId: string;
  readonly fullName: string;
  readonly occupation: string;
  readonly phone: string;
  readonly address: string;
  readonly loan?: ImportLoanInput | null;
}

/** Un problema de una fila: en qué campo y qué pasa. `message` es una clave del catálogo o ya un texto. */
export interface ImportIssue {
  readonly field: string;
  readonly message: string;
  readonly params?: Readonly<Record<string, string | number>>;
}

/**
 * Cómo quedó una fila:
 * - `READY`: pasó la validación (vista previa).
 * - `INVALID`: tiene errores; no se importa.
 * - `IMPORTED`: se creó.
 * - `FAILED`: pasó la validación pero algo falló al crearla.
 */
export type ImportRowStatus = 'READY' | 'INVALID' | 'IMPORTED' | 'FAILED';

/** El resultado de una fila. `row` cuenta desde 1, en el orden en que llegó. */
export interface ImportRowResult {
  readonly row: number;
  readonly status: ImportRowStatus;
  /** `NEW` si se crea el cliente, `EXISTING` si ya existía (o lo creó una fila anterior), `null` si la fila es inválida. */
  readonly client: 'NEW' | 'EXISTING' | null;
  /** Si la fila trae un préstamo. */
  readonly loan: boolean;
  readonly issues: readonly ImportIssue[];
}

/** Los totales de una importación. */
export interface ImportSummary {
  readonly rows: number;
  /** Filas que pasaron la validación (vista previa) o se importaron (confirmación). */
  readonly ok: number;
  readonly invalid: number;
  readonly failed: number;
  readonly newClients: number;
  readonly loans: number;
}

/** Lo que devuelve importar o revisar una hoja. */
export interface ImportOutcome {
  readonly dryRun: boolean;
  readonly summary: ImportSummary;
  readonly rows: readonly ImportRowResult[];
}
