import type { Provider } from '@nestjs/common';
import { ApproveLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/approve-loan-request.use-case.js';
import { CreateLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/create-loan-request.use-case.js';
import { FindClientIdByNationalIdUseCase } from '@/modules/loan-requests/application/use-cases/find-client-id-by-national-id.use-case.js';
import { GetLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/get-loan-request.use-case.js';
import { ListLoanRequestsUseCase } from '@/modules/loan-requests/application/use-cases/list-loan-requests.use-case.js';
import { RejectLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/reject-loan-request.use-case.js';
import { LOAN_REQUEST_REPOSITORY } from '@/modules/loan-requests/domain/tokens/loan-request-repository.token.js';
import { PrismaLoanRequestRepository } from '@/modules/loan-requests/infrastructure/persistence/prisma-loan-request.repository.js';

/** Qué implementa cada puerto del módulo. */
export const loanRequestsProviders: Provider[] = [
  { provide: LOAN_REQUEST_REPOSITORY, useClass: PrismaLoanRequestRepository },
  FindClientIdByNationalIdUseCase,
  CreateLoanRequestUseCase,
  GetLoanRequestUseCase,
  ListLoanRequestsUseCase,
  ApproveLoanRequestUseCase,
  RejectLoanRequestUseCase,
];
