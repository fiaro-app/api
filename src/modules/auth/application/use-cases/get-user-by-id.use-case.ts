import { Inject, Injectable } from '@nestjs/common';
import type { CreatedUser } from '@/modules/auth/application/dtos/create-user.dto.js';
import { toCreatedUser } from '@/modules/auth/application/dtos/created-user.mapper.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';

/**
 * Busca a la persona con ese id, si existe. Lo usa `memberships` para mostrar el nombre y el
 * celular de cada colaborador al listarlos (D-92): `memberships/application` no puede importar
 * `auth/domain` (regla de fronteras, ARCHITECTURE.md §3), así que necesita este caso de uso en
 * vez de `UserRepository` directo.
 */
@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  /**
   * @param id - Identificador de la persona.
   * @returns La persona, o `null` si no existe.
   */
  async execute(id: string): Promise<CreatedUser | null> {
    const user = await this.users.findById(id);
    return user === null ? null : toCreatedUser(user);
  }
}
