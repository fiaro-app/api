import type { Collection } from 'mongodb';
import type { AuditDocument } from '@/shared/infrastructure/audit/audit-document.js';
import { AUDIT_RETENTION_SECONDS } from '@/shared/infrastructure/audit/audit-queue.js';
import {
  type NamedIndex,
  syncIndexes,
} from '@/shared/infrastructure/records/sync-indexes.js';

/** Dónde se guardan los eventos ya construidos. */
export interface AuditStore {
  /** Guarda un evento; guardar el mismo dos veces deja uno solo. */
  save(document: AuditDocument): Promise<void>;
}

/**
 * Índices de la colección: el TTL que borra los eventos al año y los dos con que se sigue a una
 * persona (por `userId` y por la huella del celular, que también sirve para inicios de sesión
 * fallidos, que no tienen `userId`). Son `sparse`: un evento sin esos campos no ocupa lugar.
 */
export const AUDIT_INDEXES: NamedIndex[] = [
  {
    key: { occurredAt: 1 },
    name: 'occurredAt_ttl',
    expireAfterSeconds: AUDIT_RETENTION_SECONDS,
  },
  {
    key: { userId: 1, occurredAt: -1 },
    name: 'userId_occurredAt',
    sparse: true,
  },
  {
    key: { 'phone.hash': 1, occurredAt: -1 },
    name: 'phoneHash_occurredAt',
    sparse: true,
  },
];

/**
 * Guarda los eventos de auditoría en MongoDB.
 *
 * @remarks
 * Guardar es un `upsert` por `_id` que solo inserta (`$setOnInsert`): si BullMQ reintenta un
 * trabajo que ya se había guardado, o se encola dos veces, el resultado es el mismo. Los índices se
 * crean la primera vez que se guarda, no al arrancar: así la API arranca aunque MongoDB no esté, y
 * si falla al crearlos lo vuelve a intentar en el siguiente evento.
 */
export class MongoAuditStore implements AuditStore {
  private indexes: Promise<unknown> | undefined;

  /** @param collection - La colección de eventos. */
  constructor(
    private readonly collection: Pick<
      Collection<AuditDocument>,
      'createIndexes' | 'dropIndex' | 'updateOne'
    >,
  ) {}

  /** @param document - El evento que se guarda. */
  async save(document: AuditDocument): Promise<void> {
    await this.ensureIndexes();
    await this.collection.updateOne(
      { _id: document._id },
      { $setOnInsert: document },
      { upsert: true },
    );
  }

  private ensureIndexes(): Promise<unknown> {
    this.indexes ??= syncIndexes(this.collection, AUDIT_INDEXES).catch(
      (error: unknown) => {
        this.indexes = undefined;
        throw error;
      },
    );
    return this.indexes;
  }
}
