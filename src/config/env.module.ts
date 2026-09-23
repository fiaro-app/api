import { Global, Module } from '@nestjs/common';
import { loadEnv } from './env.js';
import { ENV } from './env.token.js';

/**
 * Publica la configuración validada con el token `ENV`. Es global: no hace falta importarlo en
 * cada módulo. Una variable inválida detiene el arranque.
 */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class EnvModule {}
