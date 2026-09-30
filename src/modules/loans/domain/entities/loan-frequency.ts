/**
 * Cada cuánto se cobra una cuota. Las fechas esperadas se calculan desde `startDate` (aún no
 * implementado: llega con el motor de calendario/mora).
 *
 * Mismos valores que `LoanFrequencySchema` de `@fiaro-app/contracts`; el dominio no importa el
 * contrato (regla de dependencia, ARCHITECTURE.md §3), así que los repite.
 */
export type LoanFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
