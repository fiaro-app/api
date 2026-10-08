# Permisos

Matriz completa de autorización, ruta por ruta, extraída directamente del código de los
controllers (no de PRODUCT.md, que solo describe el modelo a alto nivel). PRODUCT.md §6 llamaba a
esto "la matriz completa rol × recurso × acción (pendiente, siguiente paso)" — este documento es
esa matriz. El modelo de roles (`OWNER`/`LENDER`/`COLLECTOR`, acumulables en una misma membresía)
está en PRODUCT.md §5; el porqué de cada guard, en ARCHITECTURE.md §6.

## Cómo leer esta matriz

Toda ruta pasa, en orden, por hasta tres filtros antes de llegar al controller. Cada sección de
abajo dice, en una línea de prosa antes de su tabla, cuáles de los tres le aplican — las tablas en
sí solo tienen una columna propia, **Rol**, porque es la única pieza que varía ruta por ruta dentro
de una misma sección.

1. **`ThrottlerGuard`** (límite de tasa por IP y ruta) — aplica a todas salvo las marcadas
   `@SkipThrottle()` (ninguna tabla lo repite por fila).
2. **`AuthGuard`** (global, `src/shared/infrastructure/http/auth.guard.ts`) — exige una sesión
   vigente en **toda** ruta salvo las marcadas `@Public()` (dicho en la prosa de cada sección: "sin
   sesión"/"pública" o "sesión exigida"). Con una contraseña temporal (`mustChangePassword`), la
   sesión existe pero responde `403 PASSWORD_CHANGE_REQUIRED` en cualquier ruta que no sea pública
   — por eso una persona en ese estado solo puede ver su sesión (`GET /auth/get-session`), cambiar
   la contraseña (`POST /auth/change-password`) y cerrar sesión (`POST /auth/sign-out`): las tres
   viven en `AuthController`, que es `@Public()` a nivel de clase y nunca llega a este chequeo.
3. **`LenderScopeGuard`** (`src/shared/infrastructure/http/lender-scope.guard.ts`) — solo en las
   rutas que aíslan por prestamista (dicho en la prosa de cada sección). Resuelve
   `lenderId`/`membershipId`/`roles` de la membresía `ACTIVE` de la sesión, nunca del body/query
   del request; sin ninguna membresía activa, `403 FORBIDDEN`. **Si la persona tiene más de una
   membresía activa** (trabaja para varios prestamistas), hoy usa la más antigua sin preguntar —
   no existe todavía un selector de "con cuál prestamista opero en esta sesión" (comentario propio
   del guard, líneas 19-25; PRODUCT.md §10 solo describe el selector Admin/Cobrador, que es de rol
   dentro de un mismo prestamista, no de cuál prestamista).

Encima de `LenderScopeGuard` no hay un `RolesGuard` ni un decorador `@Roles()`: cada controller
compara a mano los roles de la sesión contra una lista fija con `hasAnyRole()`
(`src/shared/application/security/has-any-role.ts`), y lanza `403 FORBIDDEN` si no alcanza
(columna **Rol**). `Cualquiera` quiere decir que no hay ese chequeo: cualquier rol de la membresía
activa pasa. `Ninguna (propia)` quiere decir que la ruta no tiene ni guard de prestamista ni
chequeo de rol — solo exige sesión y actúa siempre sobre el propio usuario (ver "Autoservicio",
abajo). Un `—` en Rol quiere decir que la ruta es pública: el concepto de rol no aplica.

Dos detalles transversales: **no existe ninguna ruta `DELETE` ni `PUT`** todavía (todo lo que
"borra" es un estado, como desactivar una membresía o cancelar un préstamo); y `QUERY` en la
columna Ruta es el verbo HTTP `QUERY` (`@QueryMethod()`), no `GET` — lo usan las búsquedas que
necesitan filtros en el cuerpo del request.

## Autenticación — `/auth` (`AuthController`)

`@Public()` a nivel de clase entera: ninguna de estas rutas exige sesión en Nest. Todas reenvían a
`better-auth`, que valida la cookie de sesión por su cuenta cuando la ruta la necesita (`get-session`,
`sign-out`, `change-password`, `revoke-*-sessions`) — invisible para `AuthGuard`/`LenderScopeGuard`.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /auth/sign-in/phone-number` | — | Límite propio de better-auth, 5/min por IP, encima del general. |
| `GET /auth/get-session` | — | Sin cookie válida, no hay sesión que devolver — eso lo valida better-auth, no Nest. |
| `POST /auth/sign-out` | — | Igual. |
| `POST /auth/request-password-reset` | — | Antifuerza bruta por *hash* del celular (nunca el celular en claro); siempre responde `{status:true}`, no revela si la cuenta existe (D-68). |
| `POST /auth/reset-password` | — | Antifuerza bruta sobre el código; al cambiarla, revoca todas las sesiones de la persona. |
| `POST /auth/change-password` | — | Exige la cookie adentro de better-auth; revoca la sesión usada y emite una nueva (D-50). |
| `POST /auth/revoke-other-sessions` | — | Exige la cookie adentro de better-auth. |
| `POST /auth/revoke-sessions` | — | Igual; cierra todas, incluida la que llamó. |

## Cuenta — `/account` (`AccountController`)

Sesión exigida normalmente (sin `@Public()`), sin `LenderScopeGuard`: estas rutas no tocan ningún
prestamista, actúan siempre sobre `user.id` de `@CurrentUser()`, nunca sobre un id del body/query.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /account/contact-email/request-verification` | Ninguna (propia) | — |
| `POST /account/contact-email/verify` | Ninguna (propia) | Antifuerza bruta sobre el código (D-69). |
| `PATCH /account/profile` | Ninguna (propia) | Nombre y correo de contacto propios (D-70). |
| `POST /account/deactivate` | Ninguna (propia) | Exige la contraseña en el cuerpo como reconfirmación; cierra todas las sesiones propias (D-71, irreversible). |

## Registro — `/register` (`RegistrationController`)

`@Public()`: no exige sesión (es, junto con el seed de desarrollo, la única forma de que nazca un
`Lender` nuevo).

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /register` | — | Crea `Tenant` + `Lender` + membresía `OWNER` con los tres roles en una transacción (D-78). No abre sesión después: registrarse e iniciar sesión son dos pasos separados. |

## Prestamista — `/lender` (`LenderController`)

`LenderScopeGuard` en toda la clase.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `GET /lender` | Cualquiera | — |
| `PATCH /lender` | `OWNER`, `LENDER` | — |

## Carteras — `/portfolios` (`PortfolioController`)

`LenderScopeGuard` en toda la clase.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /portfolios` | `OWNER`, `LENDER` | — |
| `GET /portfolios` | Cualquiera | Sin editar ni borrar todavía: nada lo necesita aún. |

## Membresías — `/memberships` (`MembershipController`)

`LenderScopeGuard` en toda la clase. No hay `GET /memberships` (listar) todavía.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /memberships` | `OWNER`, `LENDER` | Invita a una persona nueva con los roles y la cartera dados. |
| `POST /memberships/:id/deactivate` | `OWNER`, `LENDER` | **Nunca sobre la propia membresía** (`scope.membershipId !== id`), ni siquiera para quien tiene esos roles — evita dejar un negocio sin nadie que lo administre. **Rechaza además una membresía con el rol `COLLECTOR`** (`400 VALIDATION_FAILED`): un cobrador se da de baja con `POST /collectors/:id/deactivate` (ver abajo, D-97), que reasigna sus préstamos antes de desactivarlo. |
| `PATCH /memberships/:id/roles` | `OWNER`, `LENDER` | Misma regla: nunca sobre la propia. |

## Clientes — `/clients` (`ClientController`)

`LenderScopeGuard` en toda la clase.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /clients` | `OWNER`, `LENDER` | — |
| `GET /clients/:id` | Cualquiera | `COLLECTOR` lo necesita en campo. |
| `QUERY /clients` | Cualquiera | — |
| `PATCH /clients/:id` | `OWNER`, `LENDER` | — |

## Préstamos — `/loans` (`LoanController`)

`LenderScopeGuard` en toda la clase.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /loans` | `OWNER`, `LENDER` | — |
| `GET /loans/:id` | Cualquiera | — |
| `QUERY /loans` | Cualquiera | — |
| `POST /loans/:id/cancel` | `OWNER`, `LENDER` | Mismo rol que crear (D-79): anulación por error, antes de recibir pagos. |

## Cobro en campo — `collections` (7 controllers)

`LenderScopeGuard` en toda clase.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /loans/:loanId/collection-assignments` | `OWNER`, `LENDER` | Asigna una membresía `COLLECTOR` al préstamo. |
| `GET /loans/:loanId/collection-assignments` | Cualquiera | — |
| `POST /loans/:loanId/collection-visits` | `COLLECTOR` | `collectorMembershipId` siempre `scope.membershipId`, nunca del body — el cobrador solo registra sus propias visitas. Además exige **"modo cobrador"**, ver abajo (D-89). |
| `GET /loans/:loanId/collection-visits` | Cualquiera | Ve todas las visitas del préstamo, no solo las propias. |
| `QUERY /collectors/me/route` | `COLLECTOR` | El `me` del path lo exige el código (`scope.membershipId`), no es solo convención. |
| `QUERY /collectors/me/daily-summary` | `COLLECTOR` | Siempre el propio (`scope.membershipId`). `expectedAmount` lo calcula el motor de calendario, no las visitas ya registradas (D-98). |
| `QUERY /collectors/me/stats` | `COLLECTOR` | Siempre el propio. Misma forma que `QUERY /lenders/me/stats` (D-100) le muestra al Lender sobre él, pero para su propia cartera (D-98). |
| `POST /collectors/:id/deactivate` | `OWNER`, `LENDER` | Da de baja a un cobrador reasignando, en el mismo paso, cada préstamo activo que tiene asignado hoy (D-97). Mismo chequeo que `/memberships`: **nunca sobre la propia membresía**. `reassignments` debe cubrir exactamente sus préstamos activos (`400 VALIDATION_FAILED` si no), y ningún destino puede ser el cobrador que se da de baja. Vive aquí y no en `memberships` porque solo este módulo conoce las asignaciones de cobro. |
| `GET /loans/:loanId/balance` | Cualquiera | Vive en `collections`, no en `loans`, para no crear un ciclo de módulos (D-84) — detalle arquitectónico, no de permisos. |
| `POST /payments/:id/reversals` | `OWNER`, `LENDER` | Única forma de corregir un pago (D-85). `reversedByMembershipId` siempre de la sesión. |

## Cuadre diario — `/daily-settlements` (`DailySettlementController`)

`LenderScopeGuard` en toda la clase.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `POST /daily-settlements` | `COLLECTOR` | Siempre el propio cuadre (`scope.membershipId`). |
| `GET /daily-settlements/:id` | Cualquiera | Cualquier rol ve cualquier cuadre del prestamista, no solo el propio. |
| `QUERY /daily-settlements` | Cualquiera | Igual. |
| `POST /daily-settlements/:id/approve` | `OWNER`, `LENDER` | — |
| `POST /daily-settlements/:id/reject` | `OWNER`, `LENDER` | — |

## Resumen del negocio — `lenders/me` (`LenderDashboardController`)

`LenderScopeGuard` en toda la clase.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `GET /lenders/me/dashboard` | `OWNER`, `LENDER` | Agrega cartera, cobro de hoy, cobradores, mora, alertas y cuadres `PENDING` (D-99). No tiene dominio propio: compone casos de uso ya exportados por `collections`, `loans`, `memberships` y `settlements`. |
| `QUERY /lenders/me/stats` | `OWNER`, `LENDER` | Cartera en riesgo, % en mora, mora por antigüedad (4 buckets fijos), ranking de mayor mora y desempeño por cobrador, filtrable por `collectorMembershipId`/`portfolioId` (D-100). Misma forma que `QUERY /collectors/me/stats` (D-98) le muestra a un cobrador sobre sí mismo. |

## Notificaciones — `/notifications` (`NotificationController`)

Sin `LenderScopeGuard`, a propósito: una persona que trabaja para varios prestamistas recibe
notificaciones de todos a la vez, así que no hay "un" prestamista por el que filtrar (D-87).

| Ruta | Rol | Notas |
| --- | --- | --- |
| `QUERY /notifications` | Ninguna (propia) | Siempre las propias (`recipientUserId` de `@CurrentUser()`). |
| `POST /notifications/:id/read` | Ninguna (propia) | El filtro por dueño vive en la consulta al repositorio (`findById(id, recipientUserId)`): marcar la de otra persona da `404 NOT_FOUND`, no `403`. |

## Sistema — `/health`, `/mobile/version` (`SystemController`)

`@Public()` a nivel de clase: ninguna de las dos exige sesión.

| Ruta | Rol | Notas |
| --- | --- | --- |
| `GET /health` | — | Sin límite de tasa (`@SkipThrottle()`): el orquestador la consulta seguido (D-90). |
| `GET /mobile/version` | — | — |

## Casos especiales

- **"Modo cobrador" (D-89).** Tener el rol `COLLECTOR` en el prestamista no basta para
  `POST /loans/:loanId/collection-visits`: la membresía además necesita una `CollectionAssignment`
  vigente para ese préstamo el día de la visita (`occurredAt`, no la fecha de hoy — una visita
  offline puede sincronizarse tarde, D-05, y sigue siendo legítima el día en que de verdad ocurrió).
  El chequeo vive en `CreateCollectionVisitUseCase.assertCollectorAssigned`, no en el controller —
  por eso no aparece como un guard en la tabla de arriba. Es, hoy, la única ruta de toda la API con
  este segundo nivel de autorización (ni `collection-assignments` ni `collector-route` lo repiten:
  la primera la asigna `OWNER`/`LENDER`, la segunda solo lee lo ya asignado). Detalle técnico
  completo en ARCHITECTURE.md §6.
- **Autoservicio, sin modelo de roles.** `AccountController` (perfil, correo de contacto,
  desactivar cuenta) y `NotificationController` no tienen ni `LenderScopeGuard` ni chequeo de rol:
  alcanza con tener sesión, y cada una actúa solo sobre el propio `user.id`. No es un hueco — es
  que ninguna de las dos pertenece a un prestamista en particular.
- **Una membresía nunca se administra a sí misma.** `POST /memberships/:id/deactivate` y
  `PATCH /memberships/:id/roles` rechazan `id === scope.membershipId` aunque quien llama tenga
  `OWNER`/`LENDER` — ni la dueña del negocio puede desactivarse o cambiarse los roles a sí misma
  por esta ruta.
- **Un cobrador nunca se desactiva sin reasignar (D-97).** PRODUCT.md §6 exige que desactivar un
  cobrador reasigne sus préstamos en el mismo flujo ("nunca quedan préstamos sin cobrador");
  `POST /collectors/:id/deactivate` (`DeactivateCollectorUseCase`, en `collections`) lo hace:
  reasigna primero, en una sola transacción, y solo después marca la membresía `INACTIVE` — si algo
  falla a medio camino, ningún préstamo queda huérfano, y repetir la petición es seguro. Por eso
  `POST /memberships/:id/deactivate` rechaza una membresía `COLLECTOR`: dejarla pasar por ahí
  directamente dejaría sus préstamos sin cobrador.
- **Contraseña temporal.** Con `mustChangePassword: true`, toda ruta que no sea `@Public()`
  responde `403 PASSWORD_CHANGE_REQUIRED` (`AuthGuard`) — en la práctica, solo
  `GET /auth/get-session`, `POST /auth/change-password` y `POST /auth/sign-out` quedan alcanzables
  hasta que la cambie.
- **RLS, todavía pendiente.** PRODUCT.md §6 pide Row Level Security de Postgres como segunda capa,
  además del guard de aplicación. Hoy solo existe la primera capa (`LenderScopeGuard`, esta
  matriz) — sólida y la cubre completa, pero sin la segunda, un error de código en algún repositorio
  nuevo podría dejar pasar una fila de otro prestamista sin que Postgres mismo lo impida. Pendiente
  a propósito: una implementación correcta necesita transacciones por request (`SET LOCAL
  app.lender_id` antes de cada consulta), que el cliente de Prisma compartido de hoy no da gratis.

## Lo que falta en este documento

Las rutas internas de better-auth que la API expone pero no documenta en Swagger (ver
`test/auth/guard.e2e-spec.ts`, "lo que better-auth trae y la API no publica") no están aquí: no son
parte del contrato público de la API, y están deshabilitadas a propósito.
