import type { IndexDescription } from 'mongodb';

/** Un índice con nombre: el nombre es lo que permite reconocerlo y reemplazarlo. */
export type NamedIndex = IndexDescription & { readonly name: string };

/** Lo que hace falta de una colección para dejar sus índices como el código los define. */
export interface IndexedCollection {
  /** Crea los índices que no existen. */
  createIndexes(indexes: IndexDescription[]): Promise<unknown>;
  /** Borra un índice por su nombre. */
  dropIndex(name: string): Promise<unknown>;
}

/** MongoDB: ya existe un índice con ese nombre pero otras opciones (por ejemplo, otro `expireAfterSeconds`). */
const INDEX_OPTIONS_CONFLICT = 85;

/** MongoDB: ya existe un índice con esa definición pero otro nombre, o al revés. */
const INDEX_KEY_SPECS_CONFLICT = 86;

/** MongoDB: el índice que se quiere borrar no existe. */
const INDEX_NOT_FOUND = 27;

/** Si el error es de MongoDB y trae uno de esos códigos. */
function hasCode(error: unknown, ...codes: number[]): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'number' &&
    codes.includes(error.code)
  );
}

/**
 * Deja los índices de una colección como el código los define, aunque ya existan con otras
 * opciones.
 *
 * @remarks
 * `createIndexes` no cambia un índice que ya existe: si tiene el mismo nombre y otras opciones
 * responde con un error, y sin este paso ninguna escritura llegaría a hacerse. Es lo que pasa al
 * cambiar la retención de una colección con datos (el índice TTL de `logs` pasó de 90 a 60 días y
 * cada lote fallaba con «An equivalent index already exists with the same name but different
 * options»). Ante ese conflicto se borran los índices que el código define y se vuelven a crear con
 * sus opciones actuales: es barato (las colecciones de registros son chicas y un índice de
 * vencimiento se reconstruye en segundos) y así cambiar una retención es cambiar una constante.
 * Cualquier otro error (MongoDB caído, por ejemplo) se propaga.
 *
 * @param collection - La colección.
 * @param indexes - Los índices que debe tener, con nombre.
 */
export async function syncIndexes(
  collection: IndexedCollection,
  indexes: readonly NamedIndex[],
): Promise<void> {
  try {
    await collection.createIndexes([...indexes]);
  } catch (error) {
    if (!hasCode(error, INDEX_OPTIONS_CONFLICT, INDEX_KEY_SPECS_CONFLICT)) {
      throw error;
    }
    for (const { name } of indexes) {
      await collection.dropIndex(name).catch((dropError: unknown) => {
        if (!hasCode(dropError, INDEX_NOT_FOUND)) {
          throw dropError;
        }
      });
    }
    await collection.createIndexes([...indexes]);
  }
}
