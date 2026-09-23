import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Env } from './config/env.js';
import { EnvModule } from './config/env.module.js';
import { ENV } from './config/env.token.js';

/**
 * Módulo raíz. Registra la configuración y un rate limit global por IP y por ruta
 * (`ThrottlerGuard`); una ruta lo ajusta con `@Throttle()` o lo omite con `@SkipThrottle()`.
 */
@Module({
  imports: [
    EnvModule,
    ThrottlerModule.forRootAsync({
      /** Redundante en runtime (`EnvModule` es global): los tipos de `@nestjs/throttler` 6.7 con Nest 12 lo exigen. */
      imports: [EnvModule],
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ ttl: env.throttle.ttlMs, limit: env.throttle.limit }],
        errorMessage:
          'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
