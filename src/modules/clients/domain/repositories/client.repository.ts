import type { Client } from '@/modules/clients/domain/entities/client.entity.js';

/** Criterio de {@link ClientRepository.list}. */
export interface ListClientsCriteria {
  /** El prestamista dueño de los clientes. */
  readonly lenderId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /** Texto libre contra el nombre o la cédula; ausente para listar todos. */
  readonly search?: string;
  /** Solo estos clientes; vacío no devuelve ninguno, ausente no filtra. */
  readonly ids?: readonly string[];
}

/** Una página de {@link ClientRepository.list}. */
export interface ClientsPage {
  /** Los clientes de esta página. */
  readonly items: readonly Client[];
  /** Cuántos clientes cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

/** Puerto de persistencia de los clientes. */
export interface ClientRepository {
  /**
   * @param client - Cliente nuevo.
   * @throws {@link ClientNationalIdTakenError} Si ya existe un cliente con esa cédula para el
   * mismo prestamista.
   */
  create(client: Client): Promise<void>;

  /**
   * Busca por id dentro de un prestamista: un id de otro prestamista es indistinguible de uno que
   * no existe (aislamiento por `lenderId`, PRODUCT.md §6).
   *
   * @param id - Identificador del cliente.
   * @param lenderId - El prestamista dueño.
   * @returns El cliente, o `null` si no existe para ese prestamista.
   */
  findById(id: string, lenderId: string): Promise<Client | null>;

  /** @param criteria - Prestamista, paginación y búsqueda opcional. */
  list(criteria: ListClientsCriteria): Promise<ClientsPage>;

  /**
   * Reemplaza los datos del cliente. Se guarda con su propio `lenderId`, así que no puede mover a
   * un cliente de un prestamista a otro.
   *
   * @param client - Cliente con sus datos ya actualizados.
   * @throws {@link ClientNationalIdTakenError} Si la cédula nueva ya la usa otro cliente del mismo
   * prestamista.
   */
  update(client: Client): Promise<void>;
}
