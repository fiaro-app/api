import type { Lead } from '@/modules/leads/domain/entities/lead.entity.js';

/** Puerto de persistencia de los contactos de ventas. */
export interface LeadRepository {
  /** @param lead - Contacto nuevo. */
  create(lead: Lead): Promise<void>;
}
