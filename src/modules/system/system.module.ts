import { Module } from '@nestjs/common';
import { SystemController } from '@/modules/system/infrastructure/controllers/system.controller.js';
import { systemProviders } from '@/modules/system/infrastructure/system.providers.js';

/**
 * `GET /health` y `GET /mobile/version` (D-90): infraestructura pura, sin tocar la base de datos
 * ni ningún otro módulo — toda su configuración sale de variables de entorno.
 */
@Module({
  controllers: [SystemController],
  providers: systemProviders,
})
export class SystemModule {}
