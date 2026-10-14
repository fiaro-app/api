import { Global, Module } from '@nestjs/common';
import { TurnstileService } from '@/shared/infrastructure/turnstile/turnstile.service.js';

/** Cliente compartido de Siteverify para las rutas públicas protegidas. */
@Global()
@Module({
  providers: [TurnstileService],
  exports: [TurnstileService],
})
export class TurnstileModule {}
