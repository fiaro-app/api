/**
 * Hora de envío del aviso de mora (D-96): las 08:00 de Bogotá. Colombia no tiene horario de verano,
 * así que esa hora cae siempre a las 13:00 UTC y no hace falta una librería de zonas horarias.
 */
export const MORA_RUN_HOUR_UTC = 13;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * El momento de envío del día al que pertenece un instante.
 *
 * @remarks
 * Las 13:00 UTC caen el mismo día del calendario que las 08:00 de Bogotá, así que el día de
 * negocio de un momento de envío es su fecha UTC.
 *
 * @param instant - Cualquier instante del día.
 * @returns Las 13:00 UTC de ese día.
 */
export function moraRunMomentOn(instant: Date): Date {
  return new Date(
    Date.UTC(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate(),
      MORA_RUN_HOUR_UTC,
    ),
  );
}

/**
 * El momento de envío del día siguiente. Como UTC no tiene horario de verano, son exactamente 24 horas.
 *
 * @param runMoment - Un momento de envío.
 * @returns El mismo momento, 24 horas después.
 */
export function nextMoraRunMoment(runMoment: Date): Date {
  return new Date(runMoment.getTime() + DAY_MS);
}
