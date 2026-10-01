/** Genera contraseñas temporales para cuentas que el backend crea por alguien más (invitar a un cobrador). */
export interface TempPasswordGenerator {
  /** @returns Una contraseña nueva, al azar. */
  next(): string;
}
