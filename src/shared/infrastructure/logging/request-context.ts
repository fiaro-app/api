import { AsyncLocalStorage } from 'node:async_hooks';

/** Lo que se sabe de la petición que se está atendiendo. */
export interface RequestContext {
  /** Identificador de la petición: sale en cada línea de log escrita mientras se atiende. */
  readonly requestId: string;
  /** La traza (W3C) a la que pertenece: la misma para todo un flujo si la app la reutiliza. */
  readonly traceId?: string;
  /** Esta petición dentro de la traza. */
  readonly spanId?: string;
  /** La sesión de la app: todas las peticiones de una apertura de la app la comparten. */
  readonly sessionId?: string;
  /** La pantalla desde la que se hizo la petición. */
  readonly screen?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Ejecuta `fn` con el contexto de una petición: cualquier log escrito dentro, aunque sea en otra
 * función o después de un `await`, lleva su `requestId` sin que nadie lo pase de mano en mano.
 *
 * @param context - Contexto de la petición.
 * @param fn - Lo que se ejecuta dentro del contexto.
 * @returns Lo que devuelve `fn`.
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

/**
 * El contexto de la petición en curso.
 *
 * @returns El contexto, o `undefined` fuera de una petición (el arranque, por ejemplo).
 */
export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
