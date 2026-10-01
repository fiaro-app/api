/**
 * Resultado de una visita de cobro. No existe un resultado "parcial": si hubo dinero es `PAID`,
 * y parcial o mayor se deduce comparando el monto del pago con `expectedAmount` (PRODUCT.md §5).
 * Mismos valores que `VisitOutcomeSchema` de `@fiaro-app/contracts`; el dominio no importa el
 * contrato (regla de dependencia, ARCHITECTURE.md §3), así que los repite.
 */
export type VisitOutcome = 'PAID' | 'NOT_FOUND' | 'REFUSED' | 'RESCHEDULED';
