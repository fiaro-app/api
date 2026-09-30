import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import type { CreatedMembership } from '@/modules/memberships/application/dtos/create-membership.dto.js';

/** Datos con los que se da de alta a un Tenant. */
export interface CreateTenantInput {
  /**
   * Nombre del negocio: se guarda igual en el Tenant y en su primer Lender (D-72, un solo campo
   * en el alta; el modelo ya soporta que un Tenant tenga varios Lenders con nombres distintos más
   * adelante).
   */
  readonly businessName: string;
  /**
   * Quien registra el negocio: recibe la membresía de dueño, con los tres roles (D-73,
   * PRODUCT.md §5, "Al registrarse se crean juntos el Tenant, su primer Lender y la membresía
   * del dueño con los tres roles").
   */
  readonly ownerUserId: string;
}

/** El Tenant creado, junto con su primer prestamista y la membresía de quien lo registró. */
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
  /** La membresía de dueño de quien registró el negocio, con los tres roles. */
  readonly ownerMembership: CreatedMembership;
}
