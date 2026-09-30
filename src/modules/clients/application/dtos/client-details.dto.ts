/** Los datos públicos de un cliente, tal como los describe `ClientSchema`. */
export interface ClientDetails {
  /** Identificador del cliente (UUIDv7). */
  readonly id: string;
  /** Cédula de ciudadanía, sin separadores. */
  readonly nationalId: string;
  /** Nombre completo. */
  readonly fullName: string;
  /** Oficio del cliente. */
  readonly occupation: string;
  /** Celular o fijo colombiano en formato E.164. */
  readonly phone: string;
  /** Dirección de residencia o de cobro. */
  readonly address: string;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/** Datos con los que se da de alta un cliente. */
export interface CreateClientInput {
  /** El prestamista dueño del cliente, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** Cédula, con los separadores que traiga. */
  readonly nationalId: string;
  /** Nombre completo. */
  readonly fullName: string;
  /** Oficio del cliente. */
  readonly occupation: string;
  /** Celular o fijo colombiano en formato E.164. */
  readonly phone: string;
  /** Dirección de residencia o de cobro. */
  readonly address: string;
}

/** Datos con los que se actualiza un cliente: solo lo que cambia. */
export interface UpdateClientInput {
  /** El cliente a actualizar. */
  readonly clientId: string;
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** Cédula nueva, o ausente si no cambia. */
  readonly nationalId?: string;
  /** Nombre completo nuevo, o ausente si no cambia. */
  readonly fullName?: string;
  /** Oficio nuevo, o ausente si no cambia. */
  readonly occupation?: string;
  /** Celular o fijo nuevo, o ausente si no cambia. */
  readonly phone?: string;
  /** Dirección nueva, o ausente si no cambia. */
  readonly address?: string;
}

/** Criterio y paginación de {@link ListClientsUseCase}. */
export interface ListClientsInput {
  /** El prestamista dueño de los clientes. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Texto libre contra el nombre o la cédula; ausente para listar todos. */
  readonly search?: string;
}

/** Una página de clientes. */
export interface ClientsPageResult {
  /** Los clientes de esta página. */
  readonly items: readonly ClientDetails[];
  /** Cuántos clientes cumplen el criterio en total, sin paginar. */
  readonly total: number;
}
