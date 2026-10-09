import { Module } from '@nestjs/common';
import { LeadController } from '@/modules/leads/infrastructure/controllers/lead.controller.js';
import { leadsProviders } from '@/modules/leads/infrastructure/leads.providers.js';
import { NotificationsModule } from '@/modules/notifications/notifications.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Contactos para ventas (D-114): `POST /leads`, pública y con un límite de uso propio. No depende
 * de ningún negocio: un contacto es un prospecto, anterior a cualquier Tenant. Importa
 * `NotificationsModule` solo por el envío de correo con el que avisa al equipo de ventas.
 */
@Module({
  imports: [PersistenceModule, NotificationsModule],
  controllers: [LeadController],
  providers: leadsProviders,
})
export class LeadsModule {}
