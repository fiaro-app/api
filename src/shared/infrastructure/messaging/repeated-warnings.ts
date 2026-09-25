/** Escribe un aviso. */
export type Warn = (message: string) => void;

/** Quien escribe los avisos: el `Logger` de Nest, o lo que haga sus veces. */
export interface WarningSink {
  /** Escribe un aviso. */
  warn(message: string): void;
}

/** Cómo se filtran los avisos repetidos. */
export interface RepeatedWarningsOptions {
  /** Cuánto se calla un aviso ya escrito; por defecto {@link REPEATED_WARNING_INTERVAL_MS}. */
  readonly intervalMs?: number;
  /** Reloj, en milisegundos; por defecto `Date.now`. Solo las pruebas lo cambian. */
  readonly now?: () => number;
}

/** Cuánto se calla un aviso que ya se escribió, si vuelve a llegar igual. */
export const REPEATED_WARNING_INTERVAL_MS = 60_000;

/** Cuántos textos distintos se recuerdan a la vez; pasado esto se olvidan todos y se empieza de nuevo. */
const MAX_REMEMBERED_MESSAGES = 100;

/** Lo que se recuerda de un aviso ya escrito. */
interface WrittenWarning {
  readonly at: number;
  readonly silenced: number;
}

/** «se repitió una vez» o «se repitió 3 veces». */
function repetitions(count: number): string {
  return count === 1
    ? 'se repitió una vez'
    : `se repitió ${String(count)} veces`;
}

/**
 * Envuelve un destino de avisos para que el mismo texto se escriba a lo sumo una vez por
 * intervalo, y diga cuántas veces se calló entre una escritura y la siguiente.
 *
 * @remarks
 * Una conexión que no vuelve (Redis caído, o un plan gratuito que agotó su cuota) repite el mismo
 * error en cada reintento, cada par de segundos: sin este filtro, una caída de horas son decenas de
 * miles de líneas iguales que tapan lo demás. Lo que cambia (otro texto) sale de inmediato.
 *
 * @param sink - Donde se escriben los avisos.
 * @param options - Intervalo y reloj.
 * @returns La función con la que se escriben los avisos.
 */
export function repeatedWarnings(
  sink: WarningSink,
  {
    intervalMs = REPEATED_WARNING_INTERVAL_MS,
    now = Date.now,
  }: RepeatedWarningsOptions = {},
): Warn {
  const written = new Map<string, WrittenWarning>();
  return (message) => {
    const current = now();
    const previous = written.get(message);
    if (previous !== undefined && current - previous.at < intervalMs) {
      written.set(message, { ...previous, silenced: previous.silenced + 1 });
      return;
    }
    if (written.size >= MAX_REMEMBERED_MESSAGES) {
      written.clear();
    }
    const silenced = previous?.silenced ?? 0;
    sink.warn(silenced > 0 ? `${message} (${repetitions(silenced)})` : message);
    written.set(message, { at: current, silenced: 0 });
  };
}
