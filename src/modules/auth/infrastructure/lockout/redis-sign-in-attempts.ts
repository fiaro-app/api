import type { OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type {
  SignInAttempts,
  SignInAttemptVerdict,
} from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import {
  SIGN_IN_MAX_ATTEMPTS,
  SIGN_IN_WINDOW_SECONDS,
} from '@/modules/auth/domain/policies/sign-in-lock.policy.js';
import { describeConnectionError } from '@/shared/infrastructure/messaging/describe-error.js';
import type { Warn } from '@/shared/infrastructure/messaging/repeated-warnings.js';
import { withTimeout } from '@/shared/infrastructure/messaging/with-timeout.js';

/**
 * Suma un intento y devuelve `{ cuenta, segundos que le quedan a la ventana }` en un solo comando.
 * La ventana empieza con el primer intento; a una llave que por algún motivo no tenga vencimiento
 * se le pone, para que ningún bloqueo sea eterno.
 */
const COUNT_ATTEMPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

/** Cuánto se espera a Redis: iniciar sesión no puede quedar colgado de él. */
const REDIS_TIMEOUT_MS = 1_000;

/** Un intento permitido, para cuando Redis no responde: el bloqueo no vale más que iniciar sesión. */
const ALLOWED: SignInAttemptVerdict = { allowed: true, retryAfterSeconds: 0 };

/** La respuesta del script: `[cuenta, segundos]`. */
function parseReply(reply: unknown): { count: number; ttl: number } {
  const [count, ttl] = Array.isArray(reply) ? (reply as unknown[]) : [];
  if (typeof count !== 'number' || typeof ttl !== 'number') {
    throw new TypeError('Respuesta inesperada de Redis al contar un intento.');
  }
  return { count, ttl };
}

/**
 * Cuenta los intentos en Redis, así que todas las instancias de la API cuentan lo mismo. Cada
 * celular es una llave con la cuenta y su vencimiento (`INCR` y `EXPIRE` en un solo script, por
 * lo atómico y por el costo: un intento son un comando enviado, no tres).
 *
 * @remarks
 * Si Redis no responde el intento pasa y se avisa (a lo sumo una vez por minuto): sin Redis se
 * pierde el bloqueo por celular, no la posibilidad de iniciar sesión, y el rate limit por IP sigue.
 */
export class RedisSignInAttempts implements SignInAttempts, OnModuleDestroy {
  /**
   * @param redis - La conexión; falla rápido si Redis no está (`createRedisConnection`).
   * @param prefix - Prefijo de las llaves, del entorno (`QUEUE_PREFIX`).
   * @param warn - Cómo se avisa una falla de Redis.
   * @param maxAttempts - Intentos que pasan por ventana.
   * @param windowSeconds - Duración de la ventana.
   */
  constructor(
    private readonly redis: Pick<Redis, 'eval' | 'del' | 'disconnect'>,
    private readonly prefix: string,
    private readonly warn: Warn,
    private readonly maxAttempts: number = SIGN_IN_MAX_ATTEMPTS,
    private readonly windowSeconds: number = SIGN_IN_WINDOW_SECONDS,
  ) {}

  /** @param subject - Huella del celular. */
  async register(subject: string): Promise<SignInAttemptVerdict> {
    try {
      const reply = await withTimeout(
        this.redis.eval(
          COUNT_ATTEMPT,
          1,
          this.key(subject),
          String(this.windowSeconds),
        ),
        REDIS_TIMEOUT_MS,
      );
      const { count, ttl } = parseReply(reply);
      const allowed = count <= this.maxAttempts;
      return { allowed, retryAfterSeconds: allowed ? 0 : Math.max(ttl, 1) };
    } catch (error) {
      this.warn(
        `No se pudo contar un intento de inicio de sesión: ${this.describe(error)}`,
      );
      return ALLOWED;
    }
  }

  /** @param subject - Huella del celular. */
  async clear(subject: string): Promise<void> {
    try {
      await withTimeout(this.redis.del(this.key(subject)), REDIS_TIMEOUT_MS);
    } catch (error) {
      this.warn(
        `No se pudieron olvidar los intentos de un inicio de sesión: ${this.describe(error)}`,
      );
    }
  }

  /** Cierra la conexión al apagar la API. */
  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  private key(subject: string): string {
    return `${this.prefix}:${subject}`;
  }

  private describe(error: unknown): string {
    return error instanceof Error
      ? describeConnectionError(error)
      : 'error desconocido';
  }
}
