/** Lo que deja un envío del aviso de mora: a cuántos prestamistas se les avisó y cuántos préstamos hay en mora. */
export interface MoraAlertsResult {
  /** Prestamistas a los que se les mandó el aviso (tenían al menos un préstamo en mora). */
  readonly lendersNotified: number;
  /** Préstamos en mora, sumados entre todos los prestamistas revisados. */
  readonly loansInMora: number;
}
