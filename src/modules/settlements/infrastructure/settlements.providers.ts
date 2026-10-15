import type { Provider } from '@nestjs/common';
import { CancelSettlementUseCase } from '@/modules/settlements/application/use-cases/cancel-settlement.use-case.js';
import { GetSettlementUseCase } from '@/modules/settlements/application/use-cases/get-settlement.use-case.js';
import { IsDaySettledUseCase } from '@/modules/settlements/application/use-cases/is-day-settled.use-case.js';
import { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import { ReviewSettlementUseCase } from '@/modules/settlements/application/use-cases/review-settlement.use-case.js';
import { SubmitSettlementUseCase } from '@/modules/settlements/application/use-cases/submit-settlement.use-case.js';
import { DAILY_SETTLEMENT_REPOSITORY } from '@/modules/settlements/domain/tokens/daily-settlement-repository.token.js';
import { PrismaDailySettlementRepository } from '@/modules/settlements/infrastructure/persistence/prisma-daily-settlement.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `settlements.module.ts`. */
export const settlementsProviders: Provider[] = [
  {
    provide: DAILY_SETTLEMENT_REPOSITORY,
    useClass: PrismaDailySettlementRepository,
  },
  SubmitSettlementUseCase,
  CancelSettlementUseCase,
  IsDaySettledUseCase,
  GetSettlementUseCase,
  ListSettlementsUseCase,
  ReviewSettlementUseCase,
];

/** Lo que `settlements` expone a otros módulos: los cuadres `PENDING`, que usa el resumen del Lender (D-99). */
export const settlementsExports = [ListSettlementsUseCase, IsDaySettledUseCase];
