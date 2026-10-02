/** Valores que llenan los marcadores del texto de un error (`{minLength}`), por nombre. */
export type DomainErrorParams = Readonly<Record<string, string | number>>;

/**
 * La categoría de un error de dominio: qué clase de fallo es, sin decir cómo se responde. La capa
 * que lo expone decide qué hace con cada una (la API la traduce a un estado HTTP), así que el
 * dominio no conoce HTTP.
 */
export type DomainErrorKind =
  /** Un dato no cumple una regla de formato o de valor. */
  | 'INVALID'
  /** Lo que se busca no existe, o no es visible para quien lo pide. */
  | 'NOT_FOUND'
  /** El cambio choca con el estado actual: un duplicado, algo ya procesado. */
  | 'CONFLICT'
  /** Quien lo pide no tiene permiso. */
  | 'FORBIDDEN'
  /** El estado actual no permite la operación: una regla de negocio la impide. */
  | 'RULE_VIOLATED'
  /** El servicio no puede atender la petición en este momento (mantenimiento declarado). */
  | 'UNAVAILABLE';

/** Un dato que no cumple una regla, con la ruta del campo en que ocurre. */
export interface DomainIssue {
  /** Ruta hasta el campo, por ejemplo `['email']`. */
  readonly path: readonly (string | number)[];
  /**
   * Qué regla incumple el campo: una clave del catálogo de textos (`validation.too_small.string`)
   * o el texto que ya escribió el schema que lo rechazó.
   */
  readonly message: string;
  /** Valores para los marcadores del mensaje (`{minimum}`). */
  readonly params?: DomainErrorParams;
}

/** Lo que un error de dominio puede llevar además de su mensaje. */
export interface DomainErrorDetail {
  /** Valores para los marcadores del texto del error. */
  readonly params?: DomainErrorParams;
  /** Detalle por campo, cuando el error nace de validar varios datos a la vez. */
  readonly issues?: readonly DomainIssue[];
}

/**
 * Base de los errores de negocio.
 *
 * @remarks
 * El `code` es estable: las apps reaccionan a él y nunca al texto. El `message` es para quien lee
 * el log; no se envía a la persona: el texto de la respuesta sale del catálogo de idiomas según
 * el `code` y los `params`. La `kind` dice qué clase de fallo es y la API la traduce a un estado
 * HTTP; todo error de dominio necesita un texto en `src/i18n/<idioma>/errors.json` (una prueba
 * lo comprueba).
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly kind: DomainErrorKind;
  readonly params?: DomainErrorParams;
  readonly issues?: readonly DomainIssue[];

  /**
   * @param message - Descripción para el log, no para la persona.
   * @param detail - Valores de los marcadores del texto y detalle por campo, si los hay.
   */
  constructor(message: string, detail: DomainErrorDetail = {}) {
    super(message);
    this.name = new.target.name;
    this.params = detail.params;
    this.issues = detail.issues;
  }
}
