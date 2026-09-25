import { Global, Module } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';
import { PinoAuditLog } from '@/shared/infrastructure/audit/pino-audit-log.js';

/**
 * Publica el registro de auditoría (`AUDIT_LOG`) y el enmascarador de datos personales. Es global:
 * cualquier módulo los inyecta sin importar este.
 */
@Global()
@Module({
  providers: [
    { provide: AUDIT_LOG, useClass: PinoAuditLog },
    {
      provide: PersonalDataMasker,
      inject: [ENV],
      useFactory: (env: Env) => new PersonalDataMasker(env.auth.secret),
    },
  ],
  exports: [AUDIT_LOG, PersonalDataMasker],
})
export class AuditModule {}
