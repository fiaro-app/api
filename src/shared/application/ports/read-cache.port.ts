/**
 * Caché de lecturas por prestamista (D-118): listados y estadísticas que cuestan caro de calcular
 * y se piden seguido. Toda entrada pertenece a un prestamista, así que nunca se mezclan los datos
 * de dos negocios, y cualquier escritura del prestamista las invalida todas a la vez.
 */
export interface ReadCache {
  /**
   * Devuelve lo guardado para `key` o, si no hay (o la caché no responde), lo calcula con `load`
   * y lo guarda. Un fallo de la caché nunca hace fallar la lectura: solo la hace más lenta.
   *
   * @param lenderId - El prestamista dueño de los datos.
   * @param key - Qué se lee, con todo lo que cambia el resultado (ruta, filtros, orden, página y,
   * si la respuesta depende de quién pregunta, su membresía). Ver `cacheKey`.
   * @param ttlSeconds - Cuánto puede vivir la entrada, aunque no haya escrituras.
   * @param load - Cómo se calcula el valor; debe ser JSON (lo que ya devuelve el controlador).
   */
  getOrLoad<T>(
    lenderId: string,
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T>;

  /**
   * Descarta todo lo guardado del prestamista. Se llama después de cada escritura exitosa.
   *
   * @param lenderId - El prestamista.
   */
  invalidate(lenderId: string): Promise<void>;
}
