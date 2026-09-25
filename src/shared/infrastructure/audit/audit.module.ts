import { Global, Logger, Module } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { CompositeAuditLog } from '@/shared/infrastructure/audit/composite-audit-log.js';
import { DurableAudit } from '@/shared/infrastructure/audit/durable-audit.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';
import { PinoAuditLog } from '@/shared/infrastructure/audit/pino-audit-log.js';

/** Token con el que se inyecta la {@link DurableAudit}, o `null` si no está configurada. */
const DURABLE_AUDIT = Symbol('DURABLE_AUDIT');

/**
 * Publica el registro de auditoría (`AUDIT_LOG`) y el enmascarador de datos personales. Es global:
 * cualquier módulo los inyecta sin importar este.
 *
 * @remarks
 * Siempre escribe cada evento en el log (`PinoAuditLog`). Con `REDIS_URL` y `MONGODB_URI`
 * configuradas, además lo manda a la cola que lo lleva a MongoDB (`DurableAudit`); sin ellas solo
 * queda el log y se avisa al arrancar.
 */
@Global()
@Module({
  providers: [
    {
      provide: DURABLE_AUDIT,
      inject: [ENV, ID_GENERATOR],
      useFactory: (env: Env, ids: IdGenerator): DurableAudit | null => {
        if (env.redisUrl === undefined || env.mongoUri === undefined) {
          new Logger('Audit').warn(
            'Auditoría durable apagada: faltan REDIS_URL y MONGODB_URI. Los eventos solo salen por el log.',
          );
          return null;
        }
        return DurableAudit.start(
          {
            redisUrl: env.redisUrl,
            mongoUri: env.mongoUri,
            queuePrefix: env.queuePrefix,
          },
          ids,
        );
      },
    },
    {
      provide: AUDIT_LOG,
      inject: [DURABLE_AUDIT],
      useFactory: (durable: DurableAudit | null): AuditLog =>
        new CompositeAuditLog([
          new PinoAuditLog(),
          ...(durable ? [durable.log] : []),
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
