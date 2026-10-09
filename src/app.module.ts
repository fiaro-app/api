import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '@/config/env.js';
import { EnvModule } from '@/config/env.module.js';
import { ENV } from '@/config/env.token.js';
import { AlertsModule } from '@/modules/alerts/alerts.module.js';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { ClientsModule } from '@/modules/clients/clients.module.js';
import { CollectionsModule } from '@/modules/collections/collections.module.js';
import { DashboardModule } from '@/modules/dashboard/dashboard.module.js';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';
import { SettlementsModule } from '@/modules/settlements/settlements.module.js';
import { LeadsModule } from '@/modules/leads/leads.module.js';
import { SystemModule } from '@/modules/system/system.module.js';
import { TenantsModule } from '@/modules/tenants/tenants.module.js';
import { AuditModule } from '@/shared/infrastructure/audit/audit.module.js';
import { ApiErrorsModule } from '@/shared/infrastructure/filters/api-errors.module.js';
import { AuthGuard } from '@/shared/infrastructure/http/auth.guard.js';
import { I18nModule } from '@/shared/infrastructure/i18n/i18n.module.js';
import { RecordsModule } from '@/shared/infrastructure/records/records.module.js';
import { RuntimeModule } from '@/shared/infrastructure/runtime/runtime.module.js';
import { StorageModule } from '@/shared/infrastructure/storage/storage.module.js';

/**
 * Módulo raíz. Registra la configuración, los textos traducidos (`I18nModule`), el filtro global
 * de errores (`ApiErrorsModule`), un rate limit global por IP y por ruta (`ThrottlerGuard`) y la
 * autenticación (`AuthGuard`): toda ruta exige sesión salvo las marcadas con `@Public()`. Una ruta
 * ajusta el rate limit con `@Throttle()` o lo omite con `@SkipThrottle()`.
 *
 * @remarks
 * El orden de los guards importa: el rate limit corre primero, para que las peticiones
 * sobrantes se rechacen sin consultar la base de datos. Ninguno escribe el mensaje de su
 * rechazo: el filtro global lo toma del catálogo según el `code`.
 */
@Module({
  imports: [
    EnvModule,
    I18nModule,
    RecordsModule,
    AuditModule,
    ApiErrorsModule,
    RuntimeModule,
    StorageModule,
    AuthModule,
    NotificationsModule,
    TenantsModule,
    LendersModule,
    ClientsModule,
    LoansModule,
    CollectionsModule,
    SettlementsModule,
    DashboardModule,
    AlertsModule,
    SystemModule,
    LeadsModule,
    ThrottlerModule.forRootAsync({
      /** Redundante en runtime (`EnvModule` es global): los tipos de `@nestjs/throttler` 6.7 con Nest 12 lo exigen. */
      imports: [EnvModule],
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ ttl: env.throttle.ttlMs, limit: env.throttle.limit }],
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
