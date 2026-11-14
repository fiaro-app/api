import { Injectable } from '@nestjs/common';
import type {
  ConsolidatedFigures,
  ConsolidatedLender,
  ConsolidatedStats,
  GetConsolidatedStatsInput,
} from '@/modules/dashboard/application/dtos/consolidated-stats.dto.js';
import { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { ListUserActiveMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-user-active-memberships.use-case.js';

/** Roles con los que se ve el resumen de un negocio (como `LenderDashboardController`). */
const VIEWER_ROLES: readonly string[] = ['OWNER', 'LENDER'];

const ratio = (part: number, whole: number): number | null =>
  whole === 0 ? null : part / whole;

/**
 * Las cifras de cartera y cobro de todos los negocios que la persona administra dentro del mismo
 * Tenant, cada uno y el total (D-155, plan Team).
 *
 * @remarks
 * Reusa {@link GetLenderStatsUseCase} por negocio (las cifras nunca discrepan de las del negocio solo)
 * y suma. Cuenta solo negocios del Tenant del negocio con el que opera la sesión: ese Tenant es el que
 * tiene el plan que se revisó, y una membresía en el negocio de otro Tenant no debe mezclarse. Sin
 * caché a propósito: el plan permite pocos negocios y la caché de lecturas se invalida por negocio,
 * no por Tenant.
 */
@Injectable()
export class GetConsolidatedStatsUseCase {
  constructor(
    private readonly memberships: ListUserActiveMembershipsUseCase,
    private readonly lenders: GetLenderUseCase,
    private readonly stats: GetLenderStatsUseCase,
  ) {}

  /** @param input - La persona, el negocio de su sesión y el período. */
  async execute(input: GetConsolidatedStatsInput): Promise<ConsolidatedStats> {
    const current = await this.lenders.execute(input.lenderId);
    const administered = (await this.memberships.execute(input.userId)).filter(
      (membership) =>
        membership.roles.some((role) => VIEWER_ROLES.includes(role)),
    );
    const candidates = await Promise.all(
      administered.map((membership) =>
        this.lenders.execute(membership.lenderId),
      ),
    );
    const sameTenant = candidates.filter(
      (lender) => lender.tenantId === current.tenantId,
    );
    const results = await Promise.all(
      sameTenant.map(async (lender) => ({
        lender,
        stats: await this.stats.execute({
          lenderId: lender.id,
          from: input.from,
          to: input.to,
        }),
      })),
    );
    const rows: ConsolidatedLender[] = results.map(({ lender, stats }) => ({
      lenderId: lender.id,
      name: lender.name,
      ...figures(stats),
    }));
    const period = results[0]?.stats ?? {
      from: input.from ?? '',
      to: input.to ?? '',
    };
    return {
      from: period.from,
      to: period.to,
      lenders: rows,
      totals: sum(rows),
    };
  }
}

function figures(stats: {
  totalPortfolio: number;
  portfolioAtRisk: number;
  expectedAmount: number;
  collectedAmount: number;
}): ConsolidatedFigures {
  return {
    totalPortfolio: stats.totalPortfolio,
    portfolioAtRisk: stats.portfolioAtRisk,
    arrearsRate: ratio(stats.portfolioAtRisk, stats.totalPortfolio),
    expectedAmount: stats.expectedAmount,
    collectedAmount: stats.collectedAmount,
    effectiveness: ratio(stats.collectedAmount, stats.expectedAmount),
  };
}

function sum(rows: readonly ConsolidatedFigures[]): ConsolidatedFigures {
  const total = (pick: (row: ConsolidatedFigures) => number) =>
    rows.reduce((acc, row) => acc + pick(row), 0);
  return figures({
    totalPortfolio: total((row) => row.totalPortfolio),
    portfolioAtRisk: total((row) => row.portfolioAtRisk),
    expectedAmount: total((row) => row.expectedAmount),
    collectedAmount: total((row) => row.collectedAmount),
  });
}
