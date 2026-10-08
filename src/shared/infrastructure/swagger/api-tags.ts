import { SESSION_COOKIE_NAME } from '@/shared/infrastructure/http/session-cookie.js';

/** Grupo de rutas en la documentación: su nombre en `@ApiTags()` y lo que explica de él. */
export interface ApiTagDefinition {
  /** Nombre del grupo, tal como aparece en la documentación. */
  readonly name: string;
  /** Lo que explica el grupo, en Markdown. */
  readonly description: string;
}

/**
 * Grupos de la documentación de la API. Viven aquí, y no en cada módulo, para que la
 * configuración de Swagger los conozca sin depender de ningún módulo; cada controller usa el
 * nombre con `@ApiTags(API_TAGS.<grupo>.name)`.
 */
export const API_TAGS = {
  registration: {
    name: 'Registro',
    description:
      'Registro público de un negocio nuevo (`POST /register`), sin sesión: da de alta a la persona y su Tenant, prestamista y membresía de dueño con los tres roles. No abre sesión: llama después a `POST /auth/sign-in/phone-number`.',
  },
  auth: {
    name: 'Autenticación',
    description: `Inicio de sesión con celular y contraseña. La sesión viaja en la cookie \`${SESSION_COOKIE_NAME}\` (\`HttpOnly\`, \`SameSite=Lax\`, 30 días) y cada día de uso la renueva. Las apps móviles usan el cliente de better-auth con su plugin de Expo, que guarda la cookie cifrada en el dispositivo. Un cobrador con contraseña temporal solo puede ver su sesión, cambiar la contraseña y cerrar sesión.`,
  },
  account: {
    name: 'Cuenta',
    description:
      'Gestión de la propia cuenta con sesión abierta: verificar el correo de contacto, actualizar el perfil y desactivar la cuenta.',
  },
  lender: {
    name: 'Prestamista',
    description:
      'Configuración del prestamista con el que opera la sesión (`LenderScopeGuard`, D-74): nombre, logo y días sin cobro. Verla no pide un rol específico; editarla exige `OWNER` o `LENDER`.',
  },
  client: {
    name: 'Clientes',
    description:
      'Personas deudoras del prestamista con el que opera la sesión (`LenderScopeGuard`), aisladas por `lenderId` y con `nationalId` único por prestamista. Verlas no pide un rol específico; darlas de alta o editarlas exige `OWNER` o `LENDER`.',
  },
  loan: {
    name: 'Préstamos',
    description:
      'Acuerdos de pago de un cliente del prestamista con el que opera la sesión (`LenderScopeGuard`). Verlos no pide un rol específico; darlos de alta exige `OWNER` o `LENDER`. Se pueden cancelar, pero no editar.',
  },
  portfolio: {
    name: 'Carteras',
    description:
      'Zonas que agrupan cobradores y, a través de ellos, clientes y préstamos, del prestamista con el que opera la sesión (`LenderScopeGuard`). Opcionales: si nadie crea otra, todo queda en la cartera "General" que nace con el prestamista. Verlas no pide un rol específico; darlas de alta exige `OWNER` o `LENDER`.',
  },
  membership: {
    name: 'Colaboradores',
    description:
      'Quién trabaja en el prestamista con el que opera la sesión (`LenderScopeGuard`) y con qué roles. Invitar crea la cuenta si el celular no tenía una (contraseña temporal, mostrada una sola vez); si ya tenía, solo agrega la membresía. Todas exigen `OWNER` o `LENDER`, y ninguna actúa sobre la propia membresía de la sesión.',
  },
  collectionAssignment: {
    name: 'Asignaciones de cobro',
    description:
      'Quién cobra cada préstamo del prestamista con el que opera la sesión (`LenderScopeGuard`) y durante qué fechas. Nunca se borran: reasignar (sin fecha de fin) cierra la vigente y abre una nueva, así queda el historial. Verlas no pide un rol específico; asignar exige `OWNER` o `LENDER`.',
  },
  collectionVisit: {
    name: 'Visitas de cobro',
    description:
      'Bitácora de cada intento de cobro de un préstamo del prestamista con el que opera la sesión (`LenderScopeGuard`), con su pago si hubo dinero. El id lo genera el dispositivo y sirve de llave de idempotencia: reenviar la misma visita devuelve el resultado original sin duplicar nada. Verlas no pide un rol específico; registrar una exige el rol `COLLECTOR`.',
  },
  payment: {
    name: 'Pagos',
    description:
      'Corrección de un pago registrado por error, del prestamista con el que opera la sesión (`LenderScopeGuard`). El pago queda intacto (append-only): la reversión es lo que deja de contarlo para el saldo. Un pago se reversa una sola vez; exige `OWNER` o `LENDER` en la membresía activa.',
  },
  dailySettlement: {
    name: 'Cuadres',
    description:
      'Cierre diario de un cobrador del prestamista con el que opera la sesión (`LenderScopeGuard`): lo esperado contra lo cobrado, declarado por él mismo al cerrar, con desglose por medio de pago. Uno por cobrador y día; reenviarlo lo actualiza y lo devuelve a `PENDING`. Verlo no pide un rol específico; enviarlo exige `COLLECTOR`; aprobarlo o rechazarlo exige `OWNER` o `LENDER`.',
  },
  notification: {
    name: 'Notificaciones',
    description:
      'Avisos internos de quien tiene la sesión (préstamo asignado, cuadre por revisar, cuadre rechazado), siempre los propios, de todos los prestamistas para los que trabaja salvo que filtre por uno. Nadie las crea por HTTP: siempre las genera el sistema.',
  },
  collectorRoute: {
    name: 'Ruta del cobrador',
    description:
      'Los préstamos que el cobrador de la sesión debe visitar en una fecha (hoy, si no se pide otra), con su saldo y su mora. Exige rol `COLLECTOR` en la membresía activa.',
  },
  collectorDeactivation: {
    name: 'Baja de cobradores',
    description:
      'Baja de un cobrador del prestamista con el que opera la sesión (`LenderScopeGuard`), reasignando en el mismo paso cada préstamo activo que tiene asignado hoy. Exige `OWNER` o `LENDER`, y nunca sobre la propia membresía de la sesión.',
  },
  collectorStats: {
    name: 'Estadísticas del cobrador',
    description:
      'El resumen del día y las estadísticas de desempeño del cobrador de la sesión: siempre las propias. Exige rol `COLLECTOR` en la membresía activa.',
  },
  lenderDashboard: {
    name: 'Resumen del negocio',
    description:
      'Cartera, cobro de hoy, cobradores, mora, alertas y cuadres por revisar del prestamista con el que opera la sesión (`LenderScopeGuard`). Exige `OWNER` o `LENDER`.',
  },
  system: {
    name: 'Sistema',
    description:
      'Rutas de infraestructura sin sesión (`GET /health`, `GET /mobile/version`): las usa el orquestador y la app desde el primer arranque, no una persona.',
  },
} as const satisfies Record<string, ApiTagDefinition>;
