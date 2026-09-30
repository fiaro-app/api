import type { Provider } from '@nestjs/common';
import { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';
import { PrismaLoanRepository } from '@/modules/loans/infrastructure/persistence/prisma-loan.repository.js';

/** Proveedores del módulo `loans`. */
export const loansProviders: Provider[] = [
  { provide: LOAN_REPOSITORY, useClass: PrismaLoanRepository },
  CreateLoanUseCase,
  GetLoanUseCase,
  ListLoansUseCase,
];

/** Lo que `loans` expone a otros módulos. */
export const loansExports = [
  CreateLoanUseCase,
  GetLoanUseCase,
  ListLoansUseCase,
];
