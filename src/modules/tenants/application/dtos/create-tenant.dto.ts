import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';

/** Datos con los que se da de alta a un Tenant. */
export interface CreateTenantInput {
  /**
   * Nombre del negocio: se guarda igual en el Tenant y en su primer Lender (D-72, un solo campo
   * en el alta; el modelo ya soporta que un Tenant tenga varios Lenders con nombres distintos más
   * adelante).
   */
  readonly businessName: string;
}

/** El Tenant creado, junto con su primer prestamista. */
export interface CreatedTenant {
  /** El Tenant recién creado. */
  readonly tenant: {
    /** Identificador del Tenant (UUIDv7). */
    readonly id: string;
    /** Nombre del negocio, sin espacios sobrantes. */
    readonly name: string;
    /** Cuándo se dio de alta. */
    readonly createdAt: Date;
  };
  /** Su primer prestamista, recién creado. */
  readonly lender: CreatedLender;
}
