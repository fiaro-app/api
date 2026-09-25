import { Global, Module } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { CompositeAuditLog } from '@/shared/infrastructure/audit/composite-audit-log.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';
import { PinoAuditLog } from '@/shared/infrastructure/audit/pino-audit-log.js';
import { QueueAuditLog } from '@/shared/infrastructure/audit/queue-audit-log.js';
import type { RecordsPipeline } from '@/shared/infrastructure/messaging/records-pipeline.js';
import { RECORDS_PIPELINE } from '@/shared/infrastructure/records/records.token.js';

/**
 * Publica el registro de auditoría (`AUDIT_LOG`) y el enmascarador de datos personales. Es global:
 * cualquier módulo los inyecta sin importar este.
 *
 * @remarks
 * Siempre escribe cada evento en el log (`PinoAuditLog`). Con la tubería de registros activa
 * (`RecordsModule`, que pide `REDIS_URL` y `MONGODB_URI`), además lo manda a la cola que lo lleva a
 * MongoDB (`QueueAuditLog`); sin ella solo queda el log.
 */
@Global()
@Module({
  providers: [
    {
      provide: AUDIT_LOG,
      inject: [RECORDS_PIPELINE, ID_GENERATOR],
      useFactory: (
        records: RecordsPipeline | null,
        ids: IdGenerator,
      ): AuditLog =>
        new CompositeAuditLog([
          new PinoAuditLog(),
          ...(records ? [new QueueAuditLog(records.queue, ids)] : []),
        ]),
    },
    {
      provide: PersonalDataMasker,
      inject: [ENV],
      useFactory: (env: Env) => new PersonalDataMasker(env.auth.secret),
    },
  ],
  exports: [AUDIT_LOG, PersonalDataMasker],
})
export class AuditModule {}
