import { describe, expect, it, vi } from 'vitest';
import type { LogDocument } from '@/shared/infrastructure/logging/log-document.js';
import { LOG_RETENTION_SECONDS } from '@/shared/infrastructure/logging/log-batch.js';
import {
  LOG_INDEXES,
  MongoLogStore,
} from '@/shared/infrastructure/logging/mongo-log-store.js';

const documents: LogDocument[] = [
  {
    _id: 'lote:0',
    time: new Date('2026-09-25T10:00:00.000Z'),
    recordedAt: new Date('2026-09-25T10:05:00.000Z'),
    level: 'info',
  },
  {
    _id: 'lote:1',
    time: new Date('2026-09-25T10:00:01.000Z'),
    recordedAt: new Date('2026-09-25T10:05:00.000Z'),
    level: 'warn',
  },
];

const NOT_AN_ERROR = 'texto suelto' as unknown as Error;

const bulkWriteError = (...codes: number[]) =>
  Object.assign(new Error('bulk write error'), {
    writeErrors: codes.map((code) => ({ code })),
  });

function setup(
  insertMany = vi.fn(() => Promise.resolve({})),
  createIndexes = vi.fn(() => Promise.resolve([])),
) {
  const store = new MongoLogStore({ insertMany, createIndexes } as never);
  return { store, insertMany, createIndexes };
}

describe('MongoLogStore', () => {
  it('inserta todas las líneas sin ordenar, para que una rechazada no detenga a las demás', async () => {
    const { store, insertMany } = setup();

    await store.save(documents);

    expect(insertMany).toHaveBeenCalledExactlyOnceWith(documents, {
      ordered: false,
    });
  });

  it('crea los índices la primera vez y no en cada lote', async () => {
    const { store, createIndexes } = setup();

    await store.save(documents);
    await store.save(documents);

    expect(createIndexes).toHaveBeenCalledExactlyOnceWith(LOG_INDEXES);
  });

  it('si crear los índices falla, el lote falla y el siguiente lo vuelve a intentar', async () => {
    const createIndexes = vi
      .fn()
      .mockRejectedValueOnce(new Error('MongoDB no responde'))
      .mockResolvedValue([]);
    const { store, insertMany } = setup(undefined, createIndexes);

    await expect(store.save(documents)).rejects.toThrow('MongoDB no responde');
    await store.save(documents);

    expect(createIndexes).toHaveBeenCalledTimes(2);
    expect(insertMany).toHaveBeenCalledOnce();
  });

  it('los duplicados son éxito: el lote ya estaba guardado, entero o a medias', async () => {
    const { store } = setup(
      vi.fn(() => Promise.reject(bulkWriteError(11000, 11000))),
    );

    await expect(store.save(documents)).resolves.toBeUndefined();
  });

  it('un solo error de escritura que no es un duplicado sube, para que BullMQ reintente', async () => {
    const { store } = setup(
      vi.fn(() => Promise.reject(bulkWriteError(11000, 121))),
    );

    await expect(store.save(documents)).rejects.toThrow('bulk write error');
  });

  it('un error de escritura que no es de MongoDB sube', async () => {
    const { store } = setup(
      vi.fn(() => Promise.reject(new Error('conexión cerrada'))),
    );

    await expect(store.save(documents)).rejects.toThrow('conexión cerrada');
  });

  it('un error con la lista de escrituras vacía sube', async () => {
    const { store } = setup(vi.fn(() => Promise.reject(bulkWriteError())));

    await expect(store.save(documents)).rejects.toThrow('bulk write error');
  });

  it('un error de escritura sin código sube', async () => {
    const error = Object.assign(new Error('raro'), { writeErrors: [{}] });
    const { store } = setup(vi.fn(() => Promise.reject(error)));

    await expect(store.save(documents)).rejects.toThrow('raro');
  });

  it('un error con un solo error de escritura (no una lista) también se reconoce', async () => {
    const error = Object.assign(new Error('uno'), {
      writeErrors: { code: 11000 },
    });
    const { store } = setup(vi.fn(() => Promise.reject(error)));

    await expect(store.save(documents)).resolves.toBeUndefined();
  });

  it('un valor que no es un objeto sube', async () => {
    const { store } = setup(vi.fn(() => Promise.reject(NOT_AN_ERROR)));

    await expect(store.save(documents)).rejects.toBe('texto suelto');
  });

  it('si los índices ya existen con otras opciones (otra retención) los vuelve a crear y guarda igual', async () => {
    const createIndexes = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('conflicto'), { code: 85 }),
      )
      .mockResolvedValue([]);
    const dropIndex = vi.fn<(name: string) => Promise<unknown>>(() =>
      Promise.resolve({}),
    );
    const insertMany = vi.fn(() => Promise.resolve({}));
    const store = new MongoLogStore({
      createIndexes,
      dropIndex,
      insertMany,
    } as never);

    await store.save(documents);

    expect(dropIndex.mock.calls.map(([name]) => name)).toEqual(
      LOG_INDEXES.map((index) => index.name),
    );
    expect(createIndexes).toHaveBeenCalledTimes(2);
    expect(insertMany).toHaveBeenCalledOnce();
  });

  it('el índice TTL borra a los 60 días y los otros dos son dispersos', () => {
    expect(LOG_INDEXES).toEqual([
      {
        key: { time: 1 },
        name: 'time_ttl',
        expireAfterSeconds: LOG_RETENTION_SECONDS,
      },
      { key: { requestId: 1 }, name: 'requestId', sparse: true },
      { key: { userId: 1, time: -1 }, name: 'userId_time', sparse: true },
    ]);
    expect(LOG_RETENTION_SECONDS).toBe(5_184_000);
  });
});
