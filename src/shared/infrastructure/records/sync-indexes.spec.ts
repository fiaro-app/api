import { describe, expect, it, vi } from 'vitest';
import {
  type NamedIndex,
  syncIndexes,
} from '@/shared/infrastructure/records/sync-indexes.js';

const INDEXES: NamedIndex[] = [
  { key: { time: 1 }, name: 'time_ttl', expireAfterSeconds: 5_184_000 },
  { key: { requestId: 1 }, name: 'requestId', sparse: true },
];

const mongoError = (code: number, message = 'error de MongoDB') =>
  Object.assign(new Error(message), { code });

function setup() {
  const createIndexes = vi.fn<(indexes: unknown[]) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const dropIndex = vi.fn<(name: string) => Promise<unknown>>(() =>
    Promise.resolve({}),
  );
  return { collection: { createIndexes, dropIndex }, createIndexes, dropIndex };
}

describe('syncIndexes', () => {
  it('crea los índices y no toca nada más cuando no hay conflicto', async () => {
    const { collection, createIndexes, dropIndex } = setup();

    await syncIndexes(collection, INDEXES);

    expect(createIndexes).toHaveBeenCalledExactlyOnceWith(INDEXES);
    expect(dropIndex).not.toHaveBeenCalled();
  });

  it.each([
    ['otras opciones (85)', 85],
    ['otra definición (86)', 86],
  ])(
    'si ya existe un índice con %s, borra los que define el código y los vuelve a crear',
    async (_caso, code) => {
      const { collection, createIndexes, dropIndex } = setup();
      createIndexes.mockRejectedValueOnce(mongoError(code));

      await syncIndexes(collection, INDEXES);

      expect(dropIndex.mock.calls).toEqual([['time_ttl'], ['requestId']]);
      expect(createIndexes).toHaveBeenCalledTimes(2);
      expect(createIndexes).toHaveBeenLastCalledWith(INDEXES);
    },
  );

  it('si algún índice a borrar no existe (27) sigue con los demás', async () => {
    const { collection, createIndexes, dropIndex } = setup();
    createIndexes.mockRejectedValueOnce(mongoError(85));
    dropIndex.mockRejectedValueOnce(mongoError(27, 'index not found'));

    await syncIndexes(collection, INDEXES);

    expect(dropIndex).toHaveBeenCalledTimes(2);
    expect(createIndexes).toHaveBeenCalledTimes(2);
  });

  it('cualquier otro error al crear (MongoDB caído, por ejemplo) se propaga sin borrar nada', async () => {
    const { collection, createIndexes, dropIndex } = setup();
    createIndexes.mockRejectedValueOnce(mongoError(6, 'host unreachable'));

    await expect(syncIndexes(collection, INDEXES)).rejects.toThrow(
      'host unreachable',
    );

    expect(dropIndex).not.toHaveBeenCalled();
  });

  it.each([
    ['un error sin código', new Error('sin código')],
    ['un valor que no es un objeto', 'texto suelto' as unknown as Error],
    [
      'un código que no es un número',
      Object.assign(new Error('x'), { code: '85' }),
    ],
  ])('%s no cuenta como conflicto de índices', async (_caso, error) => {
    const { collection, createIndexes, dropIndex } = setup();
    createIndexes.mockRejectedValueOnce(error);

    await expect(syncIndexes(collection, INDEXES)).rejects.toBe(error);

    expect(dropIndex).not.toHaveBeenCalled();
  });

  it('si borrar un índice falla por otro motivo, el error se propaga', async () => {
    const { collection, createIndexes, dropIndex } = setup();
    createIndexes.mockRejectedValueOnce(mongoError(85));
    dropIndex.mockRejectedValueOnce(mongoError(13, 'not authorized'));

    await expect(syncIndexes(collection, INDEXES)).rejects.toThrow(
      'not authorized',
    );

    expect(createIndexes).toHaveBeenCalledOnce();
  });

  it('un error sin código al borrar también se propaga', async () => {
    const { collection, createIndexes, dropIndex } = setup();
    createIndexes.mockRejectedValueOnce(mongoError(85));
    dropIndex.mockRejectedValueOnce(new Error('conexión cerrada'));

    await expect(syncIndexes(collection, INDEXES)).rejects.toThrow(
      'conexión cerrada',
    );
  });
});
