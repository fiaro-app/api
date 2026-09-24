import { Global, Module } from '@nestjs/common';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { SystemClock } from '@/shared/infrastructure/runtime/system-clock.js';
import { Uuid7IdGenerator } from '@/shared/infrastructure/runtime/uuid7-id-generator.js';

/**
 * Servicios del entorno de ejecución que usan todos los módulos: generación de identificadores
 * y reloj. Es global: no hace falta importarlo en cada módulo.
 */
@Global()
@Module({
  providers: [
    { provide: ID_GENERATOR, useClass: Uuid7IdGenerator },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [ID_GENERATOR, CLOCK],
})
export class RuntimeModule {}
