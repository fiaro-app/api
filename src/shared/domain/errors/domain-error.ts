/**
 * Base de los errores de negocio. El `code` es estable: las apps reaccionan a él y nunca al
 * texto del mensaje.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
