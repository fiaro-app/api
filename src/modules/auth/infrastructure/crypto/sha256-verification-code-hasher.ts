import { createHash } from 'node:crypto';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';

/**
 * Hashea con SHA-256, sin clave: a diferencia de un celular, un código de recuperación vive
 * minutos y ya está protegido por el límite de intentos, así que un hash simple alcanza.
 */
export class Sha256VerificationCodeHasher implements VerificationCodeHasher {
  /** @param code - Código en claro. */
  hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
