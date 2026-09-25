import type { Collection, IndexDescription } from 'mongodb';
import { LOG_RETENTION_SECONDS } from '@/shared/infrastructure/logging/log-batch.js';
import type { LogDocument } from '@/shared/infrastructure/logging/log-document.js';

/** Dónde se guardan las líneas de log ya construidas. */
export interface LogStore {
  /** Guarda las líneas; guardar las mismas dos veces deja una sola copia de cada una. */
  save(documents: readonly LogDocument[]): Promise<void>;
}

/**
 * Índices de la colección: el TTL que borra las líneas a los 60 días y los dos con que se sigue
 * una petición (`requestId`, todo lo que escribió) o a una persona (`userId`). Son `sparse`: una
 * línea sin esos campos (el arranque, un 404 sin sesión) no ocupa lugar en ellos.
 */
export const LOG_INDEXES: IndexDescription[] = [
  {
    key: { time: 1 },
    name: 'time_ttl',
    expireAfterSeconds: LOG_RETENTION_SECONDS,
  },
  { key: { requestId: 1 }, name: 'requestId', sparse: true },
  { key: { userId: 1, time: -1 }, name: 'userId_time', sparse: true },
];

/** Código de MongoDB para «ya existe un documento con ese `_id`». */
const DUPLICATE_KEY = 11_000;

/**
 * Los códigos de los errores por documento de una escritura en bloque, o `undefined` si el error no
 * es de ese tipo (una conexión caída, por ejemplo, que sí conviene reintentar).
 */
function writeErrorCodes(error: unknown): number[] | undefined {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('writeErrors' in error)
  ) {
    return undefined;
  }
  const { writeErrors } = error;
  const list: unknown[] = Array.isArray(writeErrors)
    ? writeErrors
    : [writeErrors];
  return list.map((writeError) =>
    typeof writeError === 'object' &&
    writeError !== null &&
    'code' in writeError &&
    typeof writeError.code === 'number'
      ? writeError.code
      : -1,
  );
}

/**
 * Guarda las líneas de log en MongoDB con `insertMany`.
 *
 * @remarks
 * `ordered: false` para que un documento rechazado no detenga a los demás. El `_id` de cada línea
 * sale del lote y de su posición, así que si BullMQ reintenta un lote que ya se había guardado
 * (a medias o entero) MongoDB responde «duplicado» para lo que ya está: eso es éxito, y cualquier
 * otro error de escritura sube para que BullMQ reintente. Los índices se crean la primera vez que se
 * guarda, no al arrancar: así la API arranca aunque MongoDB no esté.
 */
export class MongoLogStore implements LogStore {
  private indexes: Promise<unknown> | undefined;

  /** @param collection - La colección de líneas de log. */
  constructor(
    private readonly collection: Pick<
      Collection<LogDocument>,
      'createIndexes' | 'insertMany'
    >,
  ) {}

  /** @param documents - Las líneas de un lote. */
  async save(documents: readonly LogDocument[]): Promise<void> {
    await this.ensureIndexes();
    try {
      await this.collection.insertMany([...documents], { ordered: false });
    } catch (error) {
      const codes = writeErrorCodes(error);
      if (
        codes === undefined ||
        codes.length === 0 ||
        codes.some((code) => code !== DUPLICATE_KEY)
      ) {
        throw error;
      }
    }
  }

  private ensureIndexes(): Promise<unknown> {
    this.indexes ??= this.collection
      .createIndexes(LOG_INDEXES)
      .catch((error: unknown) => {
        this.indexes = undefined;
        throw error;
      });
    return this.indexes;
  }
}
