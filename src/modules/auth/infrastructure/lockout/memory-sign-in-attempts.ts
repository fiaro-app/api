import type {
  SignInAttempts,
  SignInAttemptVerdict,
} from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import {
  SIGN_IN_MAX_ATTEMPTS,
  SIGN_IN_WINDOW_SECONDS,
} from '@/modules/auth/domain/policies/sign-in-lock.policy.js';

/** Cuántos celulares se recuerdan antes de barrer los que ya vencieron. */
const SWEEP_THRESHOLD = 1_000;

/** Lo que se recuerda de un celular: cuántos intentos lleva y cuándo termina su ventana. */
interface Window {
  count: number;
  readonly endsAt: number;
}

/**
 * Cuenta los intentos en la memoria del proceso. Sirve cuando no hay Redis (desarrollo y pruebas);
 * con varias instancias de la API cada una cuenta por su lado, así que en producción se usa
 * {@link RedisSignInAttempts}.
 */
export class MemorySignInAttempts implements SignInAttempts {
  private readonly windows = new Map<string, Window>();

  /**
   * @param now - Reloj en milisegundos; en las pruebas es fijo.
   * @param maxAttempts - Intentos que pasan por ventana.
   * @param windowSeconds - Duración de la ventana.
   */
  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxAttempts: number = SIGN_IN_MAX_ATTEMPTS,
    private readonly windowSeconds: number = SIGN_IN_WINDOW_SECONDS,
  ) {}

  /** @param subject - Huella del celular. */
  register(subject: string): Promise<SignInAttemptVerdict> {
    const now = this.now();
    this.sweep(now);
    const current = this.windows.get(subject);
    const window =
      current !== undefined && current.endsAt > now
        ? current
        : { count: 0, endsAt: now + this.windowSeconds * 1_000 };
    window.count += 1;
    this.windows.set(subject, window);
    const allowed = window.count <= this.maxAttempts;
    return Promise.resolve({
      allowed,
      retryAfterSeconds: allowed ? 0 : Math.ceil((window.endsAt - now) / 1_000),
    });
  }

  /** @param subject - Huella del celular. */
  clear(subject: string): Promise<void> {
    this.windows.delete(subject);
    return Promise.resolve();
  }

  private sweep(now: number): void {
    if (this.windows.size < SWEEP_THRESHOLD) {
      return;
    }
    for (const [subject, window] of this.windows) {
      if (window.endsAt <= now) {
        this.windows.delete(subject);
      }
    }
  }
}
