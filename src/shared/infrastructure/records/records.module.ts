import { Global, Logger, Module } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { LogBatcher } from '@/shared/infrastructure/logging/log-batcher.js';
import { LOG_BATCHER } from '@/shared/infrastructure/logging/log-batcher.token.js';
import { RecordsPipeline } from '@/shared/infrastructure/messaging/records-pipeline.js';
import { repeatedWarnings } from '@/shared/infrastructure/messaging/repeated-warnings.js';
import { createRecordsProcessor } from '@/shared/infrastructure/records/records-processor.js';
import { RECORDS_PIPELINE } from '@/shared/infrastructure/records/records.token.js';

/**
 * Publica la tubería de registros (`RECORDS_PIPELINE`), la cola de BullMQ con el consumidor que
 * guarda en MongoDB lo que se registra, y el `LogBatcher` que le lleva las líneas de log en lotes
 * (`LOG_BATCHER`). Es global: quien registra algo las inyecta sin importar este módulo.
 *
 * @remarks
 * Con `REDIS_URL` y `MONGODB_URI` configuradas arranca la tubería; sin ellas publica `null` en los
 * dos, quien registra sigue escribiendo en el log y se avisa al arrancar. El `LogBatcher` se
 * registra en el cierre de la tubería: al apagar la API envía por última vez lo que tenga guardado,
 * antes de que se cierre la cola.
 */
@Global()
@Module({
  providers: [
    {
      provide: RECORDS_PIPELINE,
      inject: [ENV],
      useFactory: (env: Env): RecordsPipeline | null => {
        if (env.redisUrl === undefined || env.mongoUri === undefined) {
          new Logger('Records').warn(
            'Registro durable apagado: faltan REDIS_URL y MONGODB_URI. Los eventos de auditoría y las líneas de log solo salen por el log.',
          );
          return null;
        }
        return RecordsPipeline.start(
          {
            redisUrl: env.redisUrl,
            mongoUri: env.mongoUri,
            queuePrefix: env.queuePrefix,
          },
          createRecordsProcessor,
        );
      },
    },
    {
      provide: LOG_BATCHER,
      inject: [RECORDS_PIPELINE, ID_GENERATOR],
      useFactory: (
        records: RecordsPipeline | null,
        ids: IdGenerator,
      ): LogBatcher | null => {
        if (records === null) {
          return null;
        }
        const batcher = new LogBatcher(
          records.queue,
          ids,
          repeatedWarnings(new Logger('LogBatches')),
        );
        records.onBeforeClose(() => batcher.close());
        return batcher;
      },
    },
  ],
  exports: [RECORDS_PIPELINE, LOG_BATCHER],
})
export class RecordsModule {}
