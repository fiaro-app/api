import { describe, expect, it, vi } from 'vitest';
import type { AuditDocument } from '@/shared/infrastructure/audit/audit-document.js';
import { AUDIT_RETENTION_SECONDS } from '@/shared/infrastructure/audit/audit-queue.js';
import {
  AUDIT_INDEXES,
  MongoAuditStore,
} from '@/shared/infrastructure/audit/mongo-audit-store.js';

const document: AuditDocument = {
  _id: 'evt-1',
  action: 'auth.sign_out',
  outcome: 'SUCCESS',
  occurredAt: new Date('2026-09-25T10:00:00.000Z'),
  recordedAt: new Date('2026-09-25T10:00:01.000Z'),
};

function setup(
  createIndexes = vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([])),
) {
  const updateOne = vi.fn(() => Promise.resolve({}));
  const store = new MongoAuditStore({
    createIndexes,
    updateOne,
  } as never);
  return { store, createIndexes, updateOne };
}

describe('MongoAuditStore', () => {
  it('guarda con un upsert por _id que solo inserta: guardar dos veces el mismo evento deja uno', async () => {
    const { store, updateOne } = setup();

    await store.save(document);

    expect(updateOne).toHaveBeenCalledExactlyOnceWith(
      { _id: 'evt-1' },
      { $setOnInsert: document },
      { upsert: true },
    );
  });

  it('crea los índices antes del primer guardado y no los vuelve a crear', async () => {
    const { store, createIndexes } = setup();

    await store.save(document);
    await store.save({ ...document, _id: 'evt-2' });

    expect(createIndexes).toHaveBeenCalledExactlyOnceWith(AUDIT_INDEXES);
  });

  it('si los índices ya existen con otras opciones los vuelve a crear y guarda igual', async () => {
    const createIndexes = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('conflicto'), { code: 85 }),
      )
      .mockResolvedValue([]);
    const dropIndex = vi.fn<(name: string) => Promise<unknown>>(() =>
      Promise.resolve({}),
    );
    const updateOne = vi.fn(() => Promise.resolve({}));
    const store = new MongoAuditStore({
      createIndexes,
      dropIndex,
      updateOne,
    } as never);

    await store.save(document);

    expect(dropIndex.mock.calls.map(([name]) => name)).toEqual(
      AUDIT_INDEXES.map((index) => index.name),
    );
    expect(createIndexes).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenCalledOnce();
  });

  it('dos guardados a la vez comparten la misma creación de índices', async () => {
    const { store, createIndexes } = setup();

    await Promise.all([
      store.save(document),
      store.save({ ...document, _id: 'evt-2' }),
    ]);

    expect(createIndexes).toHaveBeenCalledOnce();
  });

  it('si crear los índices falla, el guardado falla y el siguiente lo vuelve a intentar', async () => {
    const createIndexes = vi
      .fn<() => Promise<unknown[]>>()
      .mockRejectedValueOnce(new Error('MongoDB no responde'))
      .mockResolvedValue([]);
    const { store, updateOne } = setup(createIndexes);

    await expect(store.save(document)).rejects.toThrow('MongoDB no responde');
    expect(updateOne).not.toHaveBeenCalled();
    await store.save(document);

    expect(createIndexes).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenCalledOnce();
  });

  it('si el upsert falla, el error sube para que la cola reintente', async () => {
    const { store, updateOne } = setup();
    updateOne.mockRejectedValueOnce(new Error('sin conexión'));

    await expect(store.save(document)).rejects.toThrow('sin conexión');
  });
});

describe('AUDIT_INDEXES', () => {
  it('borra los eventos al año, contado desde cuando pasaron', () => {
    expect(AUDIT_INDEXES[0]).toMatchObject({
      key: { occurredAt: 1 },
      expireAfterSeconds: AUDIT_RETENTION_SECONDS,
    });
    expect(AUDIT_RETENTION_SECONDS).toBe(31_536_000);
  });

  it('los de seguimiento de una persona son dispersos: un evento sin esos campos no ocupa lugar', () => {
    const tracking = AUDIT_INDEXES.slice(1);

    expect(tracking.map((index) => Object.keys(index.key))).toEqual([
      ['userId', 'occurredAt'],
      ['phone.hash', 'occurredAt'],
    ]);
    expect(tracking.every((index) => index.sparse === true)).toBe(true);
  });
});
