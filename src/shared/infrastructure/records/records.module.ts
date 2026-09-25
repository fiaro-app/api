import { Global, Logger, Module } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { RecordsPipeline } from '@/shared/infrastructure/messaging/records-pipeline.js';
import { createRecordsProcessor } from '@/shared/infrastructure/records/records-processor.js';
import { RECORDS_PIPELINE } from '@/shared/infrastructure/records/records.token.js';

/**
 * Publica la tubería de registros (`RECORDS_PIPELINE`): la cola de BullMQ y el consumidor que
 * guarda en MongoDB lo que se registra (los eventos de auditoría, por ahora). Es global: quien
 * registra algo la inyecta sin importar este módulo.
 *
 * @remarks
 * Con `REDIS_URL` y `MONGODB_URI` configuradas arranca la tubería; sin ellas publica `null`, quien
 * registra sigue escribiendo en el log y se avisa al arrancar.
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
            'Registro durable apagado: faltan REDIS_URL y MONGODB_URI. Lo que se registra solo sale por el log.',
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
  ],
  exports: [RECORDS_PIPELINE],
})
export class RecordsModule {}
