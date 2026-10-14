import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';

export interface TurnstileVerificationResult {
  readonly success: boolean;
  readonly errorCodes?: readonly string[];
}

interface CloudflareVerifyResponse {
  readonly success: boolean;
  readonly 'error-codes'?: string[];
  readonly challenge_ts?: string;
  readonly hostname?: string;
  readonly action?: string;
  readonly metadata?: { readonly result_with_testing_key?: boolean };
}

const CLOUDFLARE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

/**
 * Servicio para validar tokens de Cloudflare Turnstile contra su API oficial.
 *
 * @remarks
 * Si la variable `CLOUDFLARE_TURNSTILE_SECRET_KEY` no está configurada (p. ej. en desarrollo local
 * o en pruebas unitarias), la verificación se omite para no bloquear las solicitudes.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  /**
   * Valida un token de Turnstile con Cloudflare.
   *
   * @param token - Token enviado por el cliente.
   * @param remoteIp - Dirección IP del cliente (opcional).
   * @returns `true` si el token es válido o si Turnstile está deshabilitado; `false` si es inválido.
   */
  async validateToken(
    token?: string | null,
    remoteIp?: string | null,
    expectedAction?: string,
  ): Promise<boolean> {
    const { secretKey } = this.env.turnstile;
    if (!this.env.turnstile.enabled || !secretKey) {
      return true;
    }

    if (!this.isUsableToken(token)) return false;

    const data = await this.verify(token.trim(), secretKey, remoteIp);
    return data !== null && this.matchesExpectedContext(data, expectedAction);
  }

  /** Un token largo, vacío o inexistente nunca llega a la red. */
  private isUsableToken(token: string | null | undefined): token is string {
    return Boolean(token && token.trim() !== '' && token.length <= 2048);
  }

  /** Hace la única llamada a Siteverify y convierte cualquier fallo de red en una denegación. */
  private async verify(
    token: string,
    secretKey: string,
    remoteIp?: string | null,
  ): Promise<CloudflareVerifyResponse | null> {
    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token.trim());
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const res = await fetch(CLOUDFLARE_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });

      if (!res.ok) {
        this.logger.warn(
          `Cloudflare Turnstile HTTP error: ${String(res.status)}`,
        );
        return null;
      }

      return (await res.json()) as CloudflareVerifyResponse;
    } catch (error) {
      this.logger.error(
        `Error al contactar Cloudflare Turnstile: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /** Comprueba las propiedades de la respuesta que atan el token a esta superficie de la web. */
  private matchesExpectedContext(
    data: CloudflareVerifyResponse,
    expectedAction?: string,
  ): boolean {
    if (!data.success) {
      this.logger.warn(
        `Cloudflare Turnstile token inválido. Errores: ${JSON.stringify(data['error-codes'] ?? [])}`,
      );
      return false;
    }
    // Las llaves de prueba de Cloudflare no devuelven `action`; en producción `hostnames` las rechaza.
    const isTestingKey = data.metadata?.result_with_testing_key === true;
    if (expectedAction && !isTestingKey && data.action !== expectedAction) {
      this.logger.warn(
        `Cloudflare Turnstile action inesperada: ${String(data.action)}`,
      );
      return false;
    }
    if (
      this.env.turnstile.hostnames.length > 0 &&
      (!data.hostname || !this.env.turnstile.hostnames.includes(data.hostname))
    ) {
      this.logger.warn(
        `Cloudflare Turnstile hostname inesperado: ${String(data.hostname)}`,
      );
      return false;
    }
    return true;
  }
}
