import type {
  DailyPoint,
  InsightsPaymentMethod,
  SettlementIntegrity,
  VisitMix,
} from '@/modules/dashboard/domain/insights.js';

/** Cifras del período anterior (mismos días, justo antes) para mostrar la tendencia. */
export interface InsightsPrevious {
  readonly from: string;
  readonly to: string;
  readonly collected: number;
  readonly interest: number;
  readonly loansCreated: number;
  readonly amountLent: number;
}

/**
 * Las estadísticas para entender cómo va el negocio (D-133): cuánto entra y cuándo, cuánto es
 * ganancia, cuánto se prestó, cómo trabajan los cobradores y qué viene en los próximos días.
 */
export interface LenderInsights {
  readonly from: string;
  readonly to: string;
  /** Un punto por día del período: lo que vencía según el calendario y lo que se cobró. */
  readonly daily: readonly DailyPoint[];
  readonly income: {
    /** Lo cobrado en el período, sin reversiones. */
    readonly collected: number;
    /** Por medio de pago; siempre con los tres. */
    readonly byMethod: Readonly<Record<InsightsPaymentMethod, number>>;
    /** La parte de lo cobrado que es interés (ganancia). */
    readonly interest: number;
    /** La parte de lo cobrado que es capital que regresa. */
    readonly principalRecovered: number;
    /** `interest / collected`, de 0 a 1; `null` si no se cobró nada. */
    readonly interestShare: number | null;
  };
  readonly origination: {
    /** Préstamos con fecha de inicio en el período. */
    readonly loansCreated: number;
    /** Capital prestado. */
    readonly amountLent: number;
    /** Capital promedio por préstamo; `null` sin préstamos. */
    readonly averageTicket: number | null;
    /** Lo que esos préstamos devuelven de más sobre el capital (la ganancia pactada). */
    readonly agreedInterest: number;
  };
  readonly visits: VisitMix;
  readonly settlements: SettlementIntegrity;
  /** Lo que vence en los próximos 7 días (desde mañana), según el calendario de los préstamos activos. */
  readonly forecast: readonly {
    readonly date: string;
    readonly expected: number;
  }[];
  /** El período anterior, o `null` si el período no se puede comparar. */
  readonly previous: InsightsPrevious;
}

/** Qué período se pide, y de quién. */
export interface GetLenderInsightsInput {
  readonly lenderId: string;
  /** Primera fecha (`AAAA-MM-DD`); por defecto, el primer día del mes actual. */
  readonly from?: string;
  /** Última fecha (`AAAA-MM-DD`); por defecto, hoy. */
  readonly to?: string;
}
