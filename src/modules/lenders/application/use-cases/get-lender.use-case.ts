import { Inject, Injectable } from '@nestjs/common';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import { toLenderDetails } from '@/modules/lenders/application/dtos/lender-details.mapper.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';
import { LENDER_REPOSITORY } from '@/modules/lenders/domain/tokens/lender-repository.token.js';

/** Consulta los datos públicos de un prestamista. */
@Injectable()
export class GetLenderUseCase {
  constructor(
    @Inject(LENDER_REPOSITORY) private readonly lenders: LenderRepository,
  ) {}

  /**
   * @param lenderId - El prestamista, tal como lo resolvió `LenderScopeGuard`.
   * @returns Sus datos públicos.
   */
  async execute(lenderId: string): Promise<LenderDetails> {
    const lender = await this.lenders.findById(lenderId);
    if (lender === null) {
      throw new Error(`El prestamista ${lenderId} no existe.`);
    }
    return toLenderDetails(lender);
  }
}
