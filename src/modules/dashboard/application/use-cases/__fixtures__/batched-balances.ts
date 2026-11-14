import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import type { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import type { ListLoanBalancesUseCase } from '@/modules/collections/application/use-cases/list-loan-balances.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';

/**
 * `ListLoanBalancesUseCase` armado con los mismos dobles por préstamo de antes (saldo y
 * asignaciones), para que estas pruebas sigan hablando de estadísticas y no de tandas.
 */
export function batchedBalances(
  getLoanBalance: GetLoanBalanceUseCase,
  listAssignments: ListCollectionAssignmentsUseCase,
): ListLoanBalancesUseCase {
  return {
    execute: async (input: {
      lenderId: string;
      loans: readonly LoanDetails[];
      day: string;
      asOf?: string;
    }) =>
      new Map(
        await Promise.all(
          input.loans.map(async (item) => {
            const [balance, assignments] = await Promise.all([
              getLoanBalance.execute(item.id, input.lenderId, input.asOf),
              listAssignments.execute(item.id, input.lenderId),
            ]);
            const current = assignments.find(
              (assignment) =>
                assignment.effectiveFrom <= input.day &&
                (assignment.effectiveTo === null ||
                  assignment.effectiveTo >= input.day),
            );
            return [
              item.id,
              {
                ...balance,
                collectorMembershipId: current?.collectorMembershipId ?? null,
              },
            ] as const;
          }),
        ),
      ),
  } as unknown as ListLoanBalancesUseCase;
}
