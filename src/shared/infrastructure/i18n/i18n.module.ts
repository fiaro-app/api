import { Global, Module } from '@nestjs/common';
import { FLAT_CATALOGS } from '@/shared/infrastructure/i18n/message-catalog.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';

/**
 * Publica el `TranslationService` con los catálogos de `src/i18n`. Es global: cualquier módulo lo
 * inyecta sin importar este.
 */
@Global()
@Module({
  providers: [
    {
      provide: TranslationService,
      useFactory: () => new TranslationService(FLAT_CATALOGS),
    },
  ],
  exports: [TranslationService],
})
export class I18nModule {}
