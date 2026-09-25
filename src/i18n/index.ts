import esErrors from '@/i18n/es/errors.json' with { type: 'json' };
import esValidation from '@/i18n/es/validation.json' with { type: 'json' };

/**
 * Los textos de la API en el idioma de origen. Su forma define qué tiene que traducir cada idioma
 * nuevo: si a otro le falta una clave, no compila.
 */
const es = { errors: esErrors, validation: esValidation };

/** La forma que cumple el catálogo de cada idioma: grupos de textos, a cualquier profundidad. */
export type Messages = typeof es;

/**
 * Los catálogos de todos los idiomas que la API habla. Para agregar uno: una carpeta
 * `src/i18n/<idioma>/` con los mismos archivos y una línea aquí, por ejemplo
 * `en: { errors: enErrors, validation: enValidation }`.
 */
export const MESSAGES = { es } as const satisfies Record<string, Messages>;

/** Los idiomas disponibles: salen de las claves de `MESSAGES`. */
export type Language = keyof typeof MESSAGES;

/** Los idiomas que la API habla, en el orden de `MESSAGES`. */
export const LANGUAGES = Object.keys(MESSAGES) as readonly Language[];

/** Idioma que se usa cuando la petición no pide uno que la API hable. */
export const DEFAULT_LANGUAGE: Language = 'es';
