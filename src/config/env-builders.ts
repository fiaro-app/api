/** Los entornos en que corre la aplicación. */
type NodeEnvName = 'development' | 'test' | 'production';

/**
 * Si corre el aviso diario de mora (D-96). Por defecto, sí, salvo en las pruebas: un aviso programado
 * dentro de una prueba enviaría correos y crearía notificaciones que los demás casos no esperan.
 */
export function buildMoraAlertsConfig(env: {
  readonly NODE_ENV: NodeEnvName;
  readonly MORA_ALERTS?: boolean;
}) {
  return { enabled: env.MORA_ALERTS ?? env.NODE_ENV !== 'test' };
}

/**
 * Cuántos días se conservan las notificaciones antes de borrarse (D-142). Por defecto 90; `0` no borra
 * nada. En las pruebas no corre: un borrado programado dentro de una prueba tocaría datos de otras.
 */
export function buildNotificationRetentionConfig(env: {
  readonly NODE_ENV: NodeEnvName;
  readonly NOTIFICATION_RETENTION_DAYS?: number;
}) {
  return {
    days: env.NOTIFICATION_RETENTION_DAYS ?? (env.NODE_ENV === 'test' ? 0 : 90),
  };
}

/**
 * Cómo se mandan las notificaciones push (D-95): con Expo, o solo al log. Por defecto, con Expo en
 * producción y solo al log en el resto, para que ni las pruebas ni el desarrollo manden push reales.
 */
export function buildPushConfig(env: {
  readonly NODE_ENV: NodeEnvName;
  readonly PUSH_DELIVERY?: 'expo' | 'log';
  readonly EXPO_ACCESS_TOKEN?: string;
}) {
  return {
    delivery:
      env.PUSH_DELIVERY ?? (env.NODE_ENV === 'production' ? 'expo' : 'log'),
    expoAccessToken: env.EXPO_ACCESS_TOKEN,
  };
}

/** Credenciales S3/R2 de `POST /lender/logo-upload-url` (D-102), con los valores de `pnpm docker:dev`. */
export function buildS3Config(env: {
  readonly S3_ENDPOINT?: string;
  readonly S3_REGION: string;
  readonly S3_BUCKET?: string;
  readonly S3_ACCESS_KEY_ID?: string;
  readonly S3_SECRET_ACCESS_KEY?: string;
  readonly S3_PUBLIC_URL_BASE?: string;
}) {
  return {
    endpoint: env.S3_ENDPOINT ?? 'http://localhost:8333',
    region: env.S3_REGION,
    bucket: env.S3_BUCKET ?? 'fiaro-dev',
    accessKeyId: env.S3_ACCESS_KEY_ID ?? 'fiaro',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? 'fiaro-secret',
    publicUrlBase: env.S3_PUBLIC_URL_BASE ?? 'http://localhost:8333/fiaro-dev',
  };
}

/**
 * Con qué nace la suscripción de prueba de cada negocio (D-115) y el cobro con Wompi (D-149). Sin
 * las cuatro variables `WOMPI_*`, `wompi.enabled` es falso: la API arranca igual y
 * `POST /subscription/checkout` responde 503.
 */
export function buildSubscriptionConfig(env: {
  readonly SUBSCRIPTION_TRIAL_DAYS: number;
  readonly SUBSCRIPTION_TRIAL_MAX_ACTIVE_LENDERS: number;
  readonly SUBSCRIPTION_TRIAL_MAX_COLLECTORS: number;
  readonly WOMPI_PUBLIC_KEY?: string | undefined;
  readonly WOMPI_INTEGRITY_SECRET?: string | undefined;
  readonly WOMPI_EVENTS_SECRET?: string | undefined;
  readonly WOMPI_CHECKOUT_URL: string;
  readonly WOMPI_REDIRECT_URL?: string | undefined;
}) {
  return {
    trialDays: env.SUBSCRIPTION_TRIAL_DAYS,
    trialMaxActiveLenders: env.SUBSCRIPTION_TRIAL_MAX_ACTIVE_LENDERS,
    trialMaxCollectors: env.SUBSCRIPTION_TRIAL_MAX_COLLECTORS,
    wompi: {
      enabled: Boolean(
        env.WOMPI_PUBLIC_KEY &&
        env.WOMPI_INTEGRITY_SECRET &&
        env.WOMPI_EVENTS_SECRET &&
        env.WOMPI_REDIRECT_URL,
      ),
      publicKey: env.WOMPI_PUBLIC_KEY,
      integritySecret: env.WOMPI_INTEGRITY_SECRET,
      eventsSecret: env.WOMPI_EVENTS_SECRET,
      checkoutUrl: env.WOMPI_CHECKOUT_URL,
      redirectUrl: env.WOMPI_REDIRECT_URL,
    },
  };
}
