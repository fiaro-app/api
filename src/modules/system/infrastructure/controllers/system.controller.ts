import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { GetHealthUseCase } from '@/modules/system/application/use-cases/get-health.use-case.js';
import { GetMobileVersionUseCase } from '@/modules/system/application/use-cases/get-mobile-version.use-case.js';
import {
  ApiGetHealth,
  ApiGetMobileVersion,
} from '@/modules/system/infrastructure/controllers/docs/system-routes.docs.js';
import {
  toHealthResponse,
  toMobileVersionResponse,
  type HealthResponseSchema,
  type MobileVersionResponseSchema,
} from '@/modules/system/infrastructure/controllers/schemas/system-responses.schema.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Infraestructura (D-90): sin prefijo de versión (`VERSION_NEUTRAL`, D-41), igual que en
 * `@fiaro-app/contracts` — responden sin importar qué `API-Version` pida el cliente, y siguen
 * respondiendo aunque esa versión se retire.
 */
@ApiTags(API_TAGS.system.name)
@Public()
@Controller({ version: VERSION_NEUTRAL })
export class SystemController {
  constructor(
    private readonly getHealthUseCase: GetHealthUseCase,
    private readonly getMobileVersionUseCase: GetMobileVersionUseCase,
  ) {}

  /**
   * Sin límite de tasa (`@SkipThrottle()`): Fly.io la consulta seguido para decidir si la
   * instancia sigue sirviendo tráfico, y nunca debe perder esa carrera contra otras peticiones.
   */
  @Get('health')
  @SkipThrottle()
  @ApiGetHealth()
  getHealth(): z.output<typeof HealthResponseSchema> {
    return toHealthResponse(this.getHealthUseCase.execute());
  }

  @Get('mobile/version')
  @ApiGetMobileVersion()
  getMobileVersion(): z.output<typeof MobileVersionResponseSchema> {
    return toMobileVersionResponse(this.getMobileVersionUseCase.execute());
  }
}
