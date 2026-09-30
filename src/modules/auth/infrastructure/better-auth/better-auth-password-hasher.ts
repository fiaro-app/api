import { Inject, Injectable } from '@nestjs/common';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';

/** Hashea con el algoritmo de better-auth, el mismo que usa al verificar la contraseña. */
@Injectable()
export class BetterAuthPasswordHasher implements PasswordHasher {
  constructor(@Inject(BETTER_AUTH) private readonly auth: Auth) {}

  /**
   * @param password - Contraseña en claro.
   * @returns El hash, con el formato que better-auth verifica al iniciar sesión.
   */
  async hash(password: string): Promise<string> {
    const context = await this.auth.$context;
    return await context.password.hash(password);
  }

  /**
   * @param password - Contraseña en claro.
   * @param hash - Hash guardado.
   * @returns Si la contraseña corresponde al hash.
   */
  async verify(password: string, hash: string): Promise<boolean> {
    const context = await this.auth.$context;
    return await context.password.verify({ hash, password });
  }
}
