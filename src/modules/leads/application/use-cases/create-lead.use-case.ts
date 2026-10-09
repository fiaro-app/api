import { Inject, Injectable } from '@nestjs/common';
import type { CreateLeadInput } from '@/modules/leads/application/dtos/create-lead.dto.js';
import { LeadNotifier } from '@/modules/leads/application/services/lead-notifier.js';
import { validateLeadData } from '@/modules/leads/application/services/lead-data.validator.js';
import { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import type { LeadRepository } from '@/modules/leads/domain/repositories/lead.repository.js';
import { LEAD_REPOSITORY } from '@/modules/leads/domain/tokens/lead-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Guarda el contacto de alguien que quiere hablar con ventas y le avisa al equipo. Lo usa una ruta
 * pública, sin sesión.
 *
 * @remarks
 * Guarda primero y avisa después: el aviso es de mejor esfuerzo (`LeadNotifier`), así que un
 * correo caído no pierde el contacto ni le devuelve un error a quien lo dejó.
 */
@Injectable()
export class CreateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    private readonly notifier: LeadNotifier,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - Lo que escribió la persona.
   * @throws {@link InvalidLeadDataError} Si algún dato no cumple las reglas.
   */
  async execute(input: CreateLeadInput): Promise<void> {
    const data = validateLeadData(input);
    const lead = Lead.create({
      id: this.ids.next(),
      ...data,
      createdAt: this.clock.now(),
    });
    await this.leads.create(lead);
    this.notifier.notify(lead);
  }
}
