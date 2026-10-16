import type { Provider } from '@nestjs/common';
import { CancelLoanUseCase } from '@/modules/loans/application/use-cases/cancel-loan.use-case.js';
import { ACTIVE_LOAN_LIMIT } from '@/modules/loans/application/ports/active-loan-limit.token.js';
import { CountActiveLoansUseCase } from '@/modules/loans/application/use-cases/count-active-loans.use-case.js';
import { PrismaActiveLoanLimit } from '@/modules/loans/infrastructure/persistence/prisma-active-loan-limit.js';
import { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { ListLenderIdsWithActiveLoansUseCase } from '@/modules/loans/application/use-cases/list-lender-ids-with-active-loans.use-case.js';
import { ListActiveLoansByClientsUseCase } from '@/modules/loans/application/use-cases/list-active-loans-by-clients.use-case.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { ReconcileLoanStatusUseCase } from '@/modules/loans/application/use-cases/reconcile-loan-status.use-case.js';
import { LOAN_REPOSITORY } from '@/modules/loans/domain/tokens/loan-repository.token.js';
import { PrismaLoanRepository } from '@/modules/loans/infrastructure/persistence/prisma-loan.repository.js';

/** Proveedores del módulo `loans`. */
export const loansProviders: Provider[] = [
  { provide: LOAN_REPOSITORY, useClass: PrismaLoanRepository },
  { provide: ACTIVE_LOAN_LIMIT, useClass: PrismaActiveLoanLimit },
  CountActiveLoansUseCase,
  CreateLoanUseCase,
  GetLoanUseCase,
  ListLoansUseCase,
  ListActiveLoansByClientsUseCase,
  ListLenderIdsWithActiveLoansUseCase,
  CancelLoanUseCase,
  ReconcileLoanStatusUseCase,
];

/** Lo que `loans` expone a otros módulos. */
export const loansExports = [
  CountActiveLoansUseCase,
  CreateLoanUseCase,
  GetLoanUseCase,
  ListLoansUseCase,
  ListActiveLoansByClientsUseCase,
  ListLenderIdsWithActiveLoansUseCase,
  CancelLoanUseCase,
  ReconcileLoanStatusUseCase,
];
