import { Inject, Injectable } from '@nestjs/common';
import type {
  LenderDetails,
  UpdateLenderInput,
} from '@/modules/lenders/application/dtos/lender-details.dto.js';
import { toLenderDetails } from '@/modules/lenders/application/dtos/lender-details.mapper.js';
import {
  validateBrandColor,
  validateLenderData,
} from '@/modules/lenders/application/services/lender-data.validator.js';
import { Lender } from '@/modules/lenders/domain/entities/lender.entity.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';
import { LENDER_REPOSITORY } from '@/modules/lenders/domain/tokens/lender-repository.token.js';

/**
 * Actualiza los datos de un prestamista: lo que cambia, más lo que ya tenía. Revalida el
 * resultado completo con la misma regla del alta (`validateLenderData`, el contrato
 * `LenderSchema`), así el prestamista nunca queda en un estado que esa regla no aceptaría —
 * mismo patrón que `UpdateProfileUseCase` (D-70).
 */
@Injectable()
export class UpdateLenderUseCase {
  constructor(
    @Inject(LENDER_REPOSITORY) private readonly lenders: LenderRepository,
  ) {}

  /**
   * @param input - El prestamista y los campos que cambian.
   * @returns El prestamista actualizado.
   * @throws {@link InvalidLenderDataError} Si el resultado no cumple el contrato.
   */
  async execute(input: UpdateLenderInput): Promise<LenderDetails> {
    const current = await this.lenders.findById(input.lenderId);
    if (current === null) {
      throw new Error(`El prestamista ${input.lenderId} no existe.`);
    }

    const data = validateLenderData({
      name: input.name ?? current.name,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
      nonWorkingWeekdays:
        input.nonWorkingWeekdays ?? current.nonWorkingWeekdays,
      skipNationalHolidays:
        input.skipNationalHolidays ?? current.skipNationalHolidays,
    });
    const updated = Lender.create({
      id: current.id,
      tenantId: current.tenantId,
      ...data,
      brandColor: validateBrandColor(
        input.brandColor !== undefined ? input.brandColor : current.brandColor,
      ),
      createdAt: current.createdAt,
    });
    await this.lenders.update(updated);
    return toLenderDetails(updated);
  }
}
