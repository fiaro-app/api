import { Global, Module } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { OBJECT_STORAGE } from '@/shared/application/ports/object-storage.token.js';
import { S3ObjectStorageAdapter } from '@/shared/infrastructure/storage/s3-object-storage.adapter.js';

/**
 * Subida de archivos a un bucket S3 (D-102). Es global: no hace falta importarlo en cada módulo
 * que suba algo, igual que `RuntimeModule`/`AuditModule`.
 */
@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ENV],
      useFactory: (env: Env) => new S3ObjectStorageAdapter(env.s3),
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
