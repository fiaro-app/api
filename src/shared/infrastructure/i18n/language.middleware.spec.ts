import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { createLanguageMiddleware } from '@/shared/infrastructure/i18n/language.middleware.js';
import { currentLanguage } from '@/shared/infrastructure/i18n/language-context.js';

/** El idioma que ve el resto de la cadena cuando la petición trae esa cabecera. */
function languageSeenDownstream(
  acceptLanguage: string | undefined,
  supported?: readonly string[],
): string {
  const middleware = createLanguageMiddleware(supported);
  const req = { headers: { 'accept-language': acceptLanguage } } as Request;
  let seen = '';
  middleware(req, {} as Response, () => {
    seen = currentLanguage();
  });
  return seen;
}

describe('createLanguageMiddleware', () => {
  it('con los idiomas de la API responde en español aunque pidan otro', () => {
    expect(languageSeenDownstream('en-US,en;q=0.9')).toBe('es');
    expect(languageSeenDownstream(undefined)).toBe('es');
  });

  it('ejecuta el resto de la cadena en el idioma que negoció', () => {
    expect(languageSeenDownstream('en', ['es', 'en'])).toBe('en');
    expect(languageSeenDownstream('fr, en;q=0.4', ['es', 'en'])).toBe('en');
  });

  it('no deja el idioma puesto después de la petición', () => {
    languageSeenDownstream('en', ['es', 'en']);

    expect(currentLanguage()).toBe('es');
  });
});
