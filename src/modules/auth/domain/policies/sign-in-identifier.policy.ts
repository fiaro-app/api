/** Si lo que escribió la persona para entrar es un correo (trae `@`) y no un celular. */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const UINT64 = 0xffffffffffffffffn;

/**
 * Celular falso, siempre el mismo para un correo, con forma de celular colombiano (`+573…`).
 *
 * @remarks
 * Un correo sin cuenta (o sin verificar) entra por el inicio de sesión con este celular: así el
 * bloqueo por intentos, el tiempo de respuesta y el error son los de una contraseña incorrecta, y
 * quien prueba correos no puede saber cuáles existen. El celular falso nunca sale del servidor, por
 * eso basta un hash simple (FNV-1a de 64 bits) y el dominio no depende de `node:crypto`. Colisionar
 * con un celular real (1 en 10⁹) no abre nada: igual haría falta la contraseña de ese celular.
 *
 * @param email - Correo ya en minúsculas.
 */
export function pseudoPhoneForEmail(email: string): string {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(email)) {
    hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & UINT64;
  }
  return `+573${(hash % 1_000_000_000n).toString().padStart(9, '0')}`;
}
