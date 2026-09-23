# Arquitectura técnica — `api`

> Documento de referencia para quien escriba código en este repo (incluido tú mismo en 3 meses). Cubre **cómo** se construye el backend: estructura de carpetas, convenciones, reglas de dependencia. Para el **qué** y el **por qué** de producto (dominio, entidades, multi-tenancy, roadmap), ver [PRODUCT.md](./PRODUCT.md).
>
> Estado: este documento describe la arquitectura **objetivo**. El código todavía es el scaffold de `nest new` — nada de lo descrito en las secciones 3–7 está instalado o implementado aún. Se actualiza a medida que cada pieza se construye.

## 1. Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | NestJS 12 (TypeScript, `strict`) | |
| Runtime | Node 24, pnpm 11 | `packageManager` fijado en `package.json` |
| ORM | Prisma (pendiente de instalar) | Nunca se expone el tipo generado por Prisma fuera de `infrastructure` — ver sección 4 |
| Base de datos | PostgreSQL (Neon) | |
| Cache / colas | Redis (Upstash) + BullMQ | |
| Auditoría | MongoDB Atlas | Solo eventos, nunca datos transaccionales del crédito |
| Lint | oxlint (`--type-aware`) | `pnpm lint` |
| Test | Vitest (unit + e2e) | `pnpm test`, `pnpm test:e2e` |
| Docs | Compodoc | `pnpm docs` → `docs/` (no se commitea, se publica como artefacto de CI) |
| Análisis estático | SonarQube Cloud (CI-based) | Ver `.github/workflows/ci.yml` |
| Despliegue | Fly.io (Docker) | Pendiente de `Dockerfile` y `fly.toml` |

## 2. Estructura de carpetas

```
src/
  main.ts
  app.module.ts
  modules/
    auth/
      domain/            # Entidades y lógica de negocio pura — CERO dependencias de Prisma/Nest
      application/         # Casos de uso (use cases), puertos (interfaces de repositorio)
      infrastructure/       # Adaptadores: controllers, PrismaXRepository, mappers, guards concretos
    tenants/
      domain/ | application/ | infrastructure/
    lenders/
      domain/ | application/ | infrastructure/
    clients/
      domain/ | application/ | infrastructure/
    loans/
      domain/ | application/ | infrastructure/
    memberships/            # Membership (roles por Lender) + Portfolio
      domain/ | application/ | infrastructure/
    collections/            # CollectionAssignment + CollectionVisit
      domain/ | application/ | infrastructure/
    settlements/            # DailySettlement (cuadre)
      domain/ | application/ | infrastructure/
    notifications/
      domain/ | application/ | infrastructure/
    payments/
      domain/ | application/ | infrastructure/
    subscriptions/
      domain/ | application/ | infrastructure/
  shared/
    prisma/               # PrismaService, schema.prisma
    guards/                # LenderScopeGuard, SubscriptionGuard
    filters/                # Exception filters globales
    pipes/                  # ZodValidationPipe: valida params y body contra los schemas de contracts
test/
  app.e2e-spec.ts          # e2e con Vitest, una suite por flujo relevante
```

La lista de módulos (`tenants`, `lenders`, `clients`, `loans`, `collections`, `payments`, `subscriptions`, `auth`) es la propuesta 1:1 con las entidades del dominio descritas en el documento de producto (sección 5). Es el punto de partida al crear cada módulo — si en la práctica dos entidades conviene fusionarlas en un solo módulo Nest (p. ej. `payments` dentro de `loans`, dado que un `Payment` siempre nace de un `Loan`), se ajusta aquí cuando se decida.

## 3. Regla de dependencia (obligatoria, forzada por lint)

`domain` nunca importa de `infrastructure` ni de `application`. `application` puede depender de `domain`, nunca al revés. `infrastructure` puede depender de ambos.

```
infrastructure → application → domain
infrastructure ───────────────→ domain
```

Cuando se instale ESLint (hoy el lint es solo oxlint), se añade `eslint-plugin-boundaries` con esta configuración:

```json
{
  "plugins": ["boundaries"],
  "settings": {
    "boundaries/elements": [
      { "type": "domain", "pattern": "src/modules/*/domain/**" },
      { "type": "application", "pattern": "src/modules/*/application/**" },
      { "type": "infrastructure", "pattern": "src/modules/*/infrastructure/**" }
    ]
  },
  "rules": {
    "boundaries/element-types": ["error", {
      "rules": [
        { "from": "domain", "allow": ["domain"] },
        { "from": "application", "allow": ["domain", "application"] },
        { "from": "infrastructure", "allow": ["domain", "application", "infrastructure"] }
      ]
    }]
  }
}
```

Hasta que esto esté instalado, la regla se respeta por disciplina — cualquier PR que la rompa se corrige en review.

## 4. Prisma sin ensuciar el dominio

Prisma genera su propio cliente tipado, pero ese tipo **no es la entidad de dominio**. La traducción es explícita, siempre en `infrastructure`, vía un mapper:

- `domain/<entidad>.entity.ts` — clase plana, constructor privado + factory (`reconstitute`, `create`), sin decoradores, sin imports de Prisma ni de Nest.
- `infrastructure/<entidad>.mapper.ts` — `toDomain(record: PrismaX): X` y `toPersistence(entity: X): Prisma.XCreateInput`.
- `infrastructure/prisma-<entidad>.repository.ts` — implementa el puerto (`interface XRepository`) definido en `application/ports/`, inyecta `PrismaService`, usa el mapper.

Ejemplo completo en el documento de producto, sección 4.3 — se replica igual aquí una vez exista el primer módulo real (`loans`, probablemente).

## 5. Convenciones HTTP

Los schemas de cada request y respuesta, y la definición de cada endpoint (método, ruta, body, respuesta), viven en el paquete `@fiaro-app/contracts` (D-30). Esta sección fija cómo la API los aplica.

- **Recursos:** rutas en plural, kebab-case (`/collection-visits`, no `/collectionVisits`).
- **Lecturas con filtros — método `QUERY`:** las consultas con filtros combinables, rangos de fechas, ordenamiento o paginación usan el método HTTP `QUERY` (RFC de la IETF *"The HTTP QUERY Method"*) con el criterio en el **body JSON**, en lugar de `GET` con query string. `QUERY` es seguro e idempotente como `GET`, pero el filtro viaja tipado y validado por un schema de Zod de `contracts`, no queda en logs de acceso ni tiene límite de longitud de URL.
  - `GET` se reserva para lecturas por identificador o sin criterio (`GET /clients/:id`, `GET /collectors/me`).
  - `QUERY` para búsquedas y reportes: `QUERY /lenders/me/stats`, `QUERY /clients`, `QUERY /daily-settlements`, `QUERY /collectors/me/route`.
  - El body de un `QUERY` es un schema de `contracts` por caso de uso (`LoanStatsQuerySchema`, `ClientSearchQuerySchema`); si pagina, extiende `PageQuerySchema`, que ya trae los defaults de `page` y `pageSize`.
  - Soporte de plataforma: Node 24 incluye `QUERY` en `http.METHODS`; se expone en Nest con un decorador propio (`@QueryMethod(path)`) en `shared/http`. `fetch` en Expo y Next acepta el método tal cual. Por ser un método no simple, el navegador hace preflight CORS: `QUERY` debe estar en `Access-Control-Allow-Methods`.
- **Respuestas de éxito:** el recurso o colección directo, sin envelope (`{ id, ... }` o `[{ ... }]`). Para listas paginadas, un envelope mínimo: `{ data: [...], meta: { page, pageSize, total } }`.
- **Formato de datos:** JSON en camelCase (Prisma traduce a `snake_case` con `@map`), fechas de calendario `AAAA-MM-DD`, marcas de tiempo ISO 8601 con zona horaria, dinero en enteros y `null` explícito en las respuestas (D-31). Razones en el README de `contracts`.
- **Errores:** filtro de excepción global que responde `ApiErrorSchema`: `{ statusCode, code, message, path, timestamp, issues }`. `code` es un string estable que las apps usan en lugar de parsear `message`: los generales están en `ErrorCodeSchema` (`VALIDATION_FAILED`, `SUBSCRIPTION_READ_ONLY`...) y cada módulo agrega los suyos (`LOAN_NOT_FOUND`). `issues` trae el detalle por campo cuando el código es `VALIDATION_FAILED`; en los demás casos es `null`.
- **Validación:** con los schemas de Zod de `contracts`, no con DTOs de class-validator: el contrato es la única fuente de verdad. Un pipe propio (`ZodValidationPipe`, en `shared/pipes`) valida los parámetros de ruta y el body contra la definición del endpoint. Los bodies son `z.strictObject`, así que un campo desconocido responde `400 VALIDATION_FAILED` en lugar de ignorarse. Un schema por caso de uso: crear y editar no comparten schema si sus campos obligatorios difieren.
- **Compatibilidad con apps viejas:** las rutas no llevan prefijo de versión. Los cambios a la API son aditivos, los schemas de respuesta de `contracts` ignoran campos desconocidos y el version-gate (`GET /mobile/version`) bloquea las apps por debajo de `minimumSupportedVersion`. Un cambio incompatible sube esa versión mínima en el mismo despliegue.

## 6. Autenticación y autorización

- **Autenticación con better-auth** (adaptador Prisma, login teléfono + contraseña, sesiones revocables) montado en `modules/auth/infrastructure` — es un adaptador, el dominio no conoce better-auth. Sujeto a spike; plan B: JWT + refresh con Passport. Ver PRODUCT.md §8 y D-08.
- **Roles por membership**: `User` ↔ `Lender` con un conjunto de roles (`OWNER`, `LENDER`, `COLLECTOR`); los guards evalúan el conjunto, no un rol único (D-02).
- `LenderScopeGuard` (en `shared/guards`): toma `lenderId` de la membership activa de la sesión, nunca del body/query. En modo cobrador valida además que el préstamo tenga una `CollectionAssignment` vigente para esa membership.
- `SubscriptionGuard`: bloquea `POST`, `PATCH` y `DELETE` cuando la suscripción del Tenant está en solo lectura; las lecturas (`GET` y `QUERY`) siguen funcionando y la respuesta de error usa el código `SUBSCRIPTION_READ_ONLY`. Gracia de 7 días; después solo lectura **excepto** registrar visitas/pagos (D-21).
- Row Level Security de Postgres como segunda capa — se define junto con el schema de Prisma, no reemplaza al guard de aplicación.

## 7. Testing

- **Unitarios:** co-ubicados junto al archivo que prueban (`loan.entity.spec.ts` junto a `loan.entity.ts`), sin carpeta `__tests__` separada. Vitest con `globals: true` (ver `vitest.config.ts`).
- **E2E:** en `test/*.e2e-spec.ts`, uno por flujo de negocio relevante (no uno por endpoint) — usan `Test.createTestingModule` de Nest + `supertest`. Config separada (`vitest.config.e2e.ts`) para no mezclarlos con unitarios en `pnpm test`.
- **Dominio primero:** la lógica de negocio pura (`domain/`) debe ser testeable sin `TestingModule` de Nest ni mocks de Prisma — si un test de dominio necesita mockear algo, es señal de que esa lógica no debería estar en `domain/`.

## 8. Variables de entorno

Ninguna está wireada todavía (no hay Prisma, Redis ni Mongo instalados). Cuando se instalen, cada una se documenta en `.env.example` (nunca `.env` real, ver `.gitignore`) y aquí:

| Variable | Para qué | Estado |
|---|---|---|
| `DATABASE_URL` | Conexión Postgres (Neon) vía Prisma | Pendiente |
| `REDIS_URL` | Cache + broker de BullMQ (Upstash) | Pendiente |
| `MONGODB_URI` | Cola de auditoría | Pendiente |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Firma de sesiones de better-auth | Pendiente |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Storage de archivos (Cloudflare R2) | Pendiente |
| `SENTRY_DSN` | Errores en producción | Pendiente |
| `PORT` | Puerto HTTP | Pendiente (Nest usa `3000` por defecto) |

## 9. Ramas y CI

Ver el `README.md` de este repo para el flujo de ramas (`dev`/`main`) y el pipeline de CI. Este documento cubre solo arquitectura de código.
