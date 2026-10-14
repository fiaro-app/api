/** Con qué nace la suscripción de prueba de un negocio nuevo. */
export interface TrialSubscriptionSettings {
  /** Cuántos días dura la prueba. */
  trialDays(): number;
  /** Cuántos prestamistas admite. */
  maxActiveLenders(): number;
  /** Cuántos cobradores activos admite. */
  maxCollectors(): number;
}
