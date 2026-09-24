/** Genera los identificadores de las entidades (UUIDv7, D-32). */
export interface IdGenerator {
  /** @returns Un identificador nuevo, distinto de todos los anteriores. */
  next(): string;
}
