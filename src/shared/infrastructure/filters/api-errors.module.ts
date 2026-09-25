import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { ApiExceptionFilter } from '@/shared/infrastructure/filters/api-exception.filter.js';

/**
 * Registra el filtro global de excepciones y publica `ApiErrorFactory` para quien arma errores
 * fuera de él (la respuesta de better-auth). Necesita el `TranslationService` de `I18nModule`,
 * que es global.
 */
@Module({
  providers: [
    ApiErrorFactory,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [ApiErrorFactory],
})
export class ApiErrorsModule {}
