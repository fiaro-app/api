/** Reloj de la aplicación: los casos de uso no llaman a `new Date()` para que se puedan probar. */
export interface Clock {
  /** @returns La hora actual. */
  now(): Date;
}
