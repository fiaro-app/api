import { Module } from '@nestjs/common';
import { RecordRegistrationAcceptancesUseCase } from '@/modules/legal/application/use-cases/record-registration-acceptances.use-case.js';
import { LEGAL_ACCEPTANCE_REPOSITORY } from '@/modules/legal/domain/tokens/legal-acceptance-repository.token.js';
import { PrismaLegalAcceptanceRepository } from '@/modules/legal/infrastructure/persistence/prisma-legal-acceptance.repository.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/** Aceptaciones legales (D-146): la prueba de lo que cada persona aceptó al registrarse. */
@Module({
  imports: [PersistenceModule],
  providers: [
    {
      provide: LEGAL_ACCEPTANCE_REPOSITORY,
      useClass: PrismaLegalAcceptanceRepository,
    },
    RecordRegistrationAcceptancesUseCase,
  ],
  exports: [RecordRegistrationAcceptancesUseCase],
})
export class LegalModule {}
