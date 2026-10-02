/** Resultado de `GET /health`: el healthcheck HTTP que necesita Fly.io. */
export interface HealthStatus {
  /** Siempre `'ok'`: si el servicio no puede responder, no hay respuesta que mapear. */
  readonly status: 'ok';
  /** Versión desplegada de la API. */
  readonly version: string;
}
