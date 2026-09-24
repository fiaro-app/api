import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '@/config/env.js';
import { EnvModule } from '@/config/env.module.js';
import { ENV } from '@/config/env.token.js';
import { AuthModule } from '@/modules/auth/auth.module.js';
import { AuthGuard } from '@/shared/infrastructure/http/auth.guard.js';
import { RuntimeModule } from '@/shared/infrastructure/runtime/runtime.module.js';

/**
 * Módulo raíz. Registra la configuración, un rate limit global por IP y por ruta
 * (`ThrottlerGuard`) y la autenticación (`AuthGuard`): toda ruta exige sesión salvo las marcadas
 * con `@Public()`. Una ruta ajusta el rate limit con `@Throttle()` o lo omite con `@SkipThrottle()`.
 *
 * @remarks
 * El orden de los guards importa: el rate limit corre primero, para que las peticiones
 * sobrantes se rechacen sin consultar la base de datos.
 */
@Module({
  imports: [
    EnvModule,
    RuntimeModule,
    AuthModule,
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
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
