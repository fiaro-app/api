import { randomInt } from 'node:crypto';
import type { VerificationCodeGenerator } from '@/modules/auth/application/ports/verification-code-generator.port.js';
import { VERIFICATION_CODE_LENGTH } from '@/modules/auth/domain/policies/verification-code.policy.js';

/** Cuántos códigos distintos caben en {@link VERIFICATION_CODE_LENGTH} dígitos. */
const CODE_SPACE = 10 ** VERIFICATION_CODE_LENGTH;

/** Genera códigos numéricos al azar, con relleno de ceros a la izquierda. */
export class RandomVerificationCodeGenerator implements VerificationCodeGenerator {
  /** @returns Un código de {@link VERIFICATION_CODE_LENGTH} dígitos. */
  next(): string {
    return randomInt(0, CODE_SPACE)
      .toString()
      .padStart(VERIFICATION_CODE_LENGTH, '0');
  }
}
