import type { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import type { SettlementStatus } from '@/modules/settlements/domain/entities/settlement-status.js';

/** Datos de {@link DailySettlementRepository.upsert}. */
export interface UpsertDailySettlementInput {
  /** Id a usar si este envío crea el cuadre; se descarta si ya existía uno para ese día. */
  readonly id: string;
  readonly collectorMembershipId: string;
  readonly date: string;
  readonly expectedAmount: number;
  readonly collectedAmount: number;
  readonly collectedCash: number;
  readonly collectedNequi: number;
  readonly collectedTransfer: number;
  readonly collectorNote: string | null;
  readonly submittedAt: Date;
}

/** Datos de {@link DailySettlementRepository.review}. */
export interface ReviewDailySettlementInput {
  readonly id: string;
  readonly status: Extract<SettlementStatus, 'APPROVED' | 'REJECTED'>;
  readonly reviewNote: string | null;
  readonly reviewedByMembershipId: string;
  readonly reviewedAt: Date;
}

/** Criterio de {@link DailySettlementRepository.list}. */
export interface ListSettlementsCriteria {
  /** El prestamista dueño de los cuadres. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Solo los cuadres de este cobrador; ausente para listar los de todos. */
  readonly collectorMembershipId?: string;
  /** Solo los cuadres en este estado; ausente para listar todos. */
  readonly status?: SettlementStatus;
  /** Solo los cuadres de los cobradores de esta cartera; ausente para listar los de todas. */
  readonly portfolioId?: string;
  /** Primera fecha del cuadre (`AAAA-MM-DD`), inclusive; ausente para no acotar por abajo. */
  readonly from?: string;
  /** Última fecha del cuadre (`AAAA-MM-DD`), inclusive; ausente para no acotar por arriba. */
  readonly to?: string;
}

/** Una página de {@link DailySettlementRepository.list}. */
export interface SettlementsPage {
  /** Los cuadres de esta página. */
  readonly items: readonly DailySettlement[];
  /** Cuántos cuadres cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

/** Puerto de persistencia de los cuadres diarios. */
export interface DailySettlementRepository {
  /**
   * Busca por id dentro de un prestamista: un id de otro prestamista es indistinguible de uno
   * que no existe (aislamiento por `lenderId`, PRODUCT.md §6).
   *
   * @param id - Identificador del cuadre.
   * @param lenderId - El prestamista dueño.
   * @returns El cuadre, o `null` si no existe para ese prestamista.
   */
  findById(id: string, lenderId: string): Promise<DailySettlement | null>;

  /**
   * @param collectorMembershipId - El cobrador.
   * @param date - Fecha de calendario del cuadre (`AAAA-MM-DD`).
   * @returns Su cuadre de ese día, o `null` si no lo ha enviado. No filtra por prestamista: el
   * cobrador pertenece a uno solo.
   */
  findByCollectorAndDate(
    collectorMembershipId: string,
    date: string,
  ): Promise<DailySettlement | null>;

  /** Borra el cuadre (solo el cobrador que lo envió y mientras sigue `PENDING`, lo decide el caso de uso). @param id - El cuadre. */
  delete(id: string): Promise<void>;

  /** @param criteria - Prestamista, paginación y filtros opcionales. */
  list(criteria: ListSettlementsCriteria): Promise<SettlementsPage>;

  /**
   * Crea el cuadre del cobrador y el día si no existía, o lo reemplaza y lo devuelve a `PENDING`
   * si ya existía (D-36): una sola operación atómica, para que dos envíos a la vez del mismo
   * cobrador nunca choquen.
   *
   * @param input - Datos declarados por el cobrador al cerrar.
   */
  upsert(input: UpsertDailySettlementInput): Promise<DailySettlement>;

  /** @param input - La decisión del prestamista. */
  review(input: ReviewDailySettlementInput): Promise<DailySettlement>;
}
