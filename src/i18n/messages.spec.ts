import { globSync, readFileSync } from 'node:fs';
import {
  CONTRACT_MESSAGES,
  contractMessage,
  ErrorCodeSchema,
} from '@fiaro-app/contracts';
import { BASE_ERROR_CODES } from 'better-auth';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  MESSAGES,
  type Messages,
} from '@/i18n/index.js';
import { authPlugins } from '@/modules/auth/infrastructure/better-auth/auth-plugins.js';
import { codeForStatus } from '@/shared/infrastructure/filters/exception-details.js';
import {
  FLAT_CATALOGS,
  flatten,
} from '@/shared/infrastructure/i18n/message-catalog.js';

const PLACEHOLDER = /\{(\w+)\}/g;

const placeholdersOf = (text: string) =>
  [...text.matchAll(PLACEHOLDER)].map((match) => match[1]).sort();

const defaultCatalog = FLAT_CATALOGS[DEFAULT_LANGUAGE] ?? {};

describe('catálogos de idiomas', () => {
  it('el idioma de por defecto es uno de los que la API habla', () => {
    expect(LANGUAGES).toContain(DEFAULT_LANGUAGE);
    expect(Object.keys(MESSAGES)).toEqual([...LANGUAGES]);
  });

  it('todos los idiomas tienen exactamente las mismas claves que el de por defecto', () => {
    const expected = Object.keys(defaultCatalog).sort();

    for (const language of LANGUAGES) {
      expect(Object.keys(FLAT_CATALOGS[language] ?? {}).sort()).toEqual(
        expected,
      );
    }
  });

  it('todos los idiomas usan los mismos marcadores en cada texto', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(FLAT_CATALOGS[language] ?? {})) {
        expect(placeholdersOf(text), `${language}: ${key}`).toEqual(
          placeholdersOf(defaultCatalog[key] ?? ''),
        );
      }
    }
  });

  it('ningún texto queda vacío ni con espacios de más', () => {
    for (const language of LANGUAGES) {
      for (const [key, text] of Object.entries(FLAT_CATALOGS[language] ?? {})) {
        expect(text.trim(), `${language}: ${key}`).toBe(text);
        expect(text, `${language}: ${key}`).not.toBe('');
      }
    }
  });

  it('errors.json no repite ninguna clave (JSON.parse se quedaría con la última en silencio)', () => {
    const raw = readFileSync(
      new URL('es/errors.json', import.meta.url),
      'utf8',
    );
    const keys = [...raw.matchAll(/^\s*"([A-Z_]+)":/gm)].map(
      (match) => match[1],
    );

    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('un idioma al que le falta una clave no compila', () => {
    // @ts-expect-error el catálogo de un idioma nuevo debe tener toda la forma de Messages
    const incomplete: Messages = { errors: {}, validation: {} };

    expect(incomplete).toBeDefined();
  });
});

describe('textos de los schemas del contrato', () => {
  it('cada idioma de la API tiene los textos que el contrato escribe, iguales a los del paquete', () => {
    for (const language of LANGUAGES) {
      const fromPackage = flatten(CONTRACT_MESSAGES[language]);
      const inApi = Object.fromEntries(
        Object.entries(FLAT_CATALOGS[language] ?? {}).filter(([key]) =>
          key.startsWith('contracts.'),
        ),
      );

      expect(Object.keys(fromPackage).length).toBeGreaterThan(0);
      expect(inApi).toEqual(fromPackage);
      for (const key of Object.keys(fromPackage)) {
        expect(inApi[key], `${language}: ${key}`).toBe(
          contractMessage(language, key),
        );
      }
    }
  });
});

describe('textos de los errores', () => {
  const hasText = (code: string) =>
    Object.hasOwn(defaultCatalog, `errors.${code}`);

  it('cada código general del contrato tiene su texto', () => {
    for (const code of ErrorCodeSchema.options) {
      expect(hasText(code), code).toBe(true);
    }
  });

  it('cada código que se deduce de un estado HTTP tiene su texto', () => {
    const codes = new Set(
      Array.from({ length: 200 }, (_, i) => codeForStatus(400 + i)),
    );

    for (const code of codes) {
      expect(hasText(code), code).toBe(true);
    }
  });

  it('cada código de error de dominio tiene su texto: al agregar uno sin texto, falla aquí', () => {
    const codes = globSync('src/**/*.error.ts').flatMap((file) =>
      [
        ...readFileSync(file, 'utf8').matchAll(/readonly code = '([A-Z_]+)'/g),
      ].map((match) => match[1] ?? ''),
    );

    expect(codes.length).toBeGreaterThanOrEqual(4);
    expect(codes.filter((code) => !hasText(code))).toEqual([]);
  });

  it('cada código de error de better-auth tiene su texto en español: al actualizarlo, uno nuevo falla aquí', () => {
    const pluginCodes = authPlugins().flatMap((plugin) =>
      '$ERROR_CODES' in plugin ? Object.keys(plugin.$ERROR_CODES) : [],
    );
    const codes = [...Object.keys(BASE_ERROR_CODES), ...pluginCodes];

    expect(codes.length).toBeGreaterThan(50);
    expect(codes.filter((code) => !hasText(code))).toEqual([]);
  });
});
