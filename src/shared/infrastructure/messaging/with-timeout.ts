/**
 * Espera una promesa, pero no más de `ms` milisegundos.
 *
 * @remarks
 * Si el tiempo se agota gana el rechazo, y la promesa original sigue su curso sin que nadie la
 * espere (su resultado, o su error, se descarta). Sirve para no quedar colgado de un servicio que
 * no responde, por ejemplo Redis caído: BullMQ espera la conexión sin límite.
 *
 * @param promise - Lo que se espera.
 * @param ms - Tiempo máximo, en milisegundos.
 * @returns Lo que resuelva `promise`.
 * @throws Un error si `promise` no termina a tiempo, o el que lance `promise`.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`sin respuesta en ${String(ms)} ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, expired]);
  } finally {
    clearTimeout(timer);
  }
}
