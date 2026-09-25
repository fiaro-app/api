import { describe, expect, it } from 'vitest';
import {
  currentLanguage,
  runWithLanguage,
} from '@/shared/infrastructure/i18n/language-context.js';

describe('idioma de la petición', () => {
  it('fuera de una petición es el idioma de por defecto', () => {
    expect(currentLanguage()).toBe('es');
  });

  it('dentro de una petición es el suyo, también después de un await', async () => {
    const seen = await runWithLanguage('en', async () => {
      await Promise.resolve();
      return currentLanguage();
    });

    expect(seen).toBe('en');
    expect(currentLanguage()).toBe('es');
  });

  it('cada petición ve el suyo aunque corran a la vez', async () => {
    const languageAfterTick = (language: string) =>
      runWithLanguage(language, async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return currentLanguage();
      });

    const seen = await Promise.all([
      languageAfterTick('en'),
      languageAfterTick('es'),
      languageAfterTick('pt'),
    ]);

    expect(seen).toEqual(['en', 'es', 'pt']);
  });

  it('devuelve lo que devuelve la función', () => {
    expect(runWithLanguage('en', () => 42)).toBe(42);
  });
});
