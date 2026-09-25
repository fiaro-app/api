import { AsyncLocalStorage } from 'node:async_hooks';
import { DEFAULT_LANGUAGE } from '@/i18n/index.js';

const storage = new AsyncLocalStorage<string>();

/**
 * Ejecuta `fn` con el idioma de una petición: cualquier texto que se traduzca dentro, aunque sea
 * en otra función o después de un `await`, sale en ese idioma sin que nadie lo pase de mano en
 * mano.
 *
 * @param language - Idioma de la petición.
 * @param fn - Lo que se ejecuta dentro del contexto.
 * @returns Lo que devuelve `fn`.
 */
export function runWithLanguage<T>(language: string, fn: () => T): T {
  return storage.run(language, fn);
}

/**
 * El idioma de la petición en curso.
 *
 * @returns El idioma de la petición, o el de por defecto fuera de una petición.
 */
export function currentLanguage(): string {
  return storage.getStore() ?? DEFAULT_LANGUAGE;
}
