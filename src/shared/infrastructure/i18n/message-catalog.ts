import { MESSAGES, type Messages } from '@/i18n/index.js';

/** Un árbol de textos: cada hoja es un texto y cada rama, un grupo. */
export interface MessageTree {
  readonly [key: string]: string | MessageTree;
}

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/**
 * Toda clave que tiene texto en el catálogo, como ruta con puntos: `errors.NOT_FOUND`,
 * `validation.too_small.string`. Traducir una clave que no existe no compila.
 */
export type MessageKey = Leaves<Messages>;

/** Valores que reemplazan a los marcadores `{nombre}` de un texto. */
export type MessageParams = Readonly<Record<string, string | number>>;

/** El catálogo de un idioma con las claves ya como rutas con puntos. */
export type FlatCatalog = Readonly<Record<string, string>>;

/** Los catálogos de todos los idiomas, por código de idioma. */
export type FlatCatalogs = Readonly<Record<string, FlatCatalog>>;

/**
 * Aplana un árbol de textos: `{ errors: { NOT_FOUND: 'x' } }` queda como `{ 'errors.NOT_FOUND': 'x' }`.
 *
 * @param tree - Árbol de textos de un idioma.
 * @param prefix - Ruta de la rama que se recorre; solo la usa la recursión.
 */
export function flatten(
  tree: MessageTree,
  prefix = '',
): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') {
      flat[`${prefix}${key}`] = value;
    } else {
      Object.assign(flat, flatten(value, `${prefix}${key}.`));
    }
  }
  return flat;
}

/** Los catálogos de todos los idiomas de `MESSAGES`, aplanados. */
export const FLAT_CATALOGS: FlatCatalogs = Object.fromEntries(
  Object.entries(MESSAGES).map(([language, tree]) => [language, flatten(tree)]),
);

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Reemplaza los marcadores `{nombre}` de un texto por sus valores. Un marcador sin valor queda
 * tal cual, a la vista, en lugar de escribir `undefined`.
 *
 * @param text - Texto con marcadores.
 * @param params - Valores por nombre de marcador.
 */
export function interpolate(text: string, params: MessageParams = {}): string {
  return text.replaceAll(PLACEHOLDER, (placeholder, name: string) =>
    String(params[name] ?? placeholder),
  );
}
