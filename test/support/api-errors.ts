import { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { FLAT_CATALOGS } from '@/shared/infrastructure/i18n/message-catalog.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';

/**
 * La fábrica de errores con los catálogos reales, para las pruebas unitarias que no levantan
 * Nest.
 */
export function realApiErrors(
  nodeEnv: 'test' | 'development' | 'production' = 'test',
): ApiErrorFactory {
  return new ApiErrorFactory(new TranslationService(FLAT_CATALOGS), {
    nodeEnv,
  });
}
