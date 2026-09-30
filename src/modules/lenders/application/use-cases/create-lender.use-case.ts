import { DEFAULT_NON_WORKING_WEEKDAYS } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateLenderInput,
  CreatedLender,
} from '@/modules/lenders/application/dtos/create-lender.dto.js';
import { toCreatedLender } from '@/modules/lenders/application/dtos/created-lender.mapper.js';
import { validateLenderData } from '@/modules/lenders/application/services/lender-data.validator.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';
import { LENDER_REPOSITORY } from '@/modules/lenders/domain/tokens/lender-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Da de alta a un prestamista para un Tenant que ya existe. Nace sin logo (no hay carga de
 * archivos al dar de alta) y con los días sin cobro por defecto del contrato compartido.
 */
@Injectable()
export class CreateLenderUseCase {
  constructor(
    @Inject(LENDER_REPOSITORY) private readonly lenders: LenderRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El Tenant dueño y el nombre del negocio.
   * @returns El prestamista creado, con el id de su cartera "General" por defecto.
   * @throws {@link InvalidLenderDataError} Si el nombre no cumple el contrato.
   */
  async execute(input: CreateLenderInput): Promise<CreatedLender> {
    const data = validateLenderData(input);
    const lender = Lender.create({
      id: this.ids.next(),
      tenantId: input.tenantId,
      name: data.name,
      logoUrl: null,
      nonWorkingWeekdays: DEFAULT_NON_WORKING_WEEKDAYS,
      skipNationalHolidays: false,
      createdAt: this.clock.now(),
    });
    const defaultPortfolioId = this.ids.next();
    await this.lenders.create(lender, defaultPortfolioId);
    return toCreatedLender(lender, defaultPortfolioId);
  }
}
