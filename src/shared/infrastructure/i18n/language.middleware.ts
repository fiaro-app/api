import type { RequestHandler } from 'express';
import { DEFAULT_LANGUAGE, LANGUAGES } from '@/i18n/index.js';
import { negotiateLanguage } from '@/shared/infrastructure/i18n/accept-language.js';
import { runWithLanguage } from '@/shared/infrastructure/i18n/language-context.js';

/**
 * Crea el middleware que elige el idioma de la petición según `Accept-Language` y ejecuta el
 * resto de la cadena dentro de él: cualquier texto traducido después sale en ese idioma
 * (`TranslationService`).
 *
 * @param supported - Idiomas que la API habla; por defecto, los de `src/i18n`. Solo las pruebas
 * pasan otros.
 */
export function createLanguageMiddleware(
  supported: readonly string[] = LANGUAGES,
): RequestHandler {
  return (req, _res, next) => {
    const language = negotiateLanguage(
      req.headers['accept-language'],
      supported,
      DEFAULT_LANGUAGE,
    );
    runWithLanguage(language, next);
  };
}
