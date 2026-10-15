/**
 * Catálogo de códigos de error de Fiaro (D-134). Cada error que la API puede devolver tiene un
 * código único `<ÁREA><NNN><ORIGEN>` (por ejemplo `L003A`): una letra de área, tres dígitos de
 * secuencia y una letra que dice de dónde viene el fallo. El código sale siempre en la respuesta
 * (`errorCode`) y en el log; la explicación y qué mirar (`hint`) salen solo en el log y, fuera de
 * producción, en `debug` de la respuesta. Ver `EMAIL-PUSH-STANDARD.md` hermano: `ERROR-CODES.md`.
 */

/** Forma de un código: una letra de área, tres dígitos y una letra de origen. */
export const ERROR_CODE_FORMAT = /^[A-Z]\d{3}[A-Z]$/;

/** La letra final: de dónde viene el fallo. */
export const ERROR_ORIGINS = {
  A: 'Regla de negocio de Fiaro',
  V: 'Validación de lo que envió el cliente',
  D: 'Base de datos (PostgreSQL)',
  R: 'Redis (caché y colas)',
  M: 'MongoDB (logs y auditoría)',
  S: 'Almacenamiento (S3/R2)',
  E: 'Proveedor de correo (Resend)',
  X: 'Proveedor de push (Expo)',
  F: 'Cloudflare (Turnstile)',
  H: 'Borde HTTP (límite de tasa, formato, mantenimiento)',
  U: 'Interno o desconocido',
} as const;

/** La letra inicial: a qué parte del producto pertenece. */
export const ERROR_AREAS = {
  A: 'Cuenta y sesión',
  C: 'Clientes',
  L: 'Préstamos',
  V: 'Cobro en campo',
  S: 'Cuadres',
  M: 'Colaboradores',
  B: 'Negocio y carteras',
  N: 'Notificaciones',
  T: 'Registro de negocios',
  G: 'Contacto de ventas',
  U: 'Suscripción',
  W: 'Sistema',
  P: 'Plataforma (genéricos y proveedores)',
} as const;

/** Qué es y qué mirar cuando aparece. */
export interface ErrorCodeInfo {
  readonly title: string;
  readonly hint: string;
}

import data from '@/shared/domain/errors/error-catalog.json' with { type: 'json' };

/**
 * Todos los códigos con su explicación para quien investiga (`error-catalog.json`, para que el
 * archivo de datos no pese sobre el código).
 */
export const ERROR_CATALOG: Readonly<Record<string, ErrorCodeInfo>> =
  data.catalog;

/** Código de la API (`code`) → código único, para los errores que no son de una clase de dominio. */
export const ERROR_CODE_BY_API_CODE: Readonly<Record<string, string>> =
  data.byApiCode;

/** Los códigos de «sin clasificar» y de «error interno», para cuando nada más aplica. */
export const GENERIC_ERROR_CODES = {
  unknown: data.byApiCode.UNKNOWN,
  internal: data.byApiCode.INTERNAL_ERROR,
};

/** Código único de un fallo de un proveedor externo. */
export const PROVIDER_ERROR_CODES = data.providers as {
  readonly DATABASE: string;
  readonly REDIS: string;
  readonly MONGO: string;
  readonly STORAGE: string;
  readonly EMAIL: string;
  readonly PUSH: string;
  readonly CLOUDFLARE: string;
};

/**
 * @param errorCode - Un código único.
 * @returns Su explicación, o `undefined` si no está en el catálogo.
 */
export function errorCodeInfo(errorCode: string): ErrorCodeInfo | undefined {
  return ERROR_CATALOG[errorCode];
}
