# Arquitectura técnica — `api`

> Documento de referencia para quien escriba código en este repo (incluido tú mismo en 3 meses). Cubre **cómo** se construye el backend: estructura de carpetas, convenciones, reglas de dependencia. Para el **qué** y el **por qué** de producto (dominio, entidades, multi-tenancy, roadmap), ver el documento de arquitectura del sistema a nivel de producto que vive junto a este repo en `Fiaro/arquitectura-sistema-prestamos.md`.
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
    collections/            # CollectionAssignment + CollectionVisit
      domain/ | application/ | infrastructure/
    payments/
      domain/ | application/ | infrastructure/
    subscriptions/
      domain/ | application/ | infrastructure/
  shared/
    prisma/               # PrismaService, schema.prisma
    guards/                # LenderScopeGuard, SubscriptionGuard
    filters/                # Exception filters globales
    pipes/                  # ValidationPipe config, pipes custom
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

## 5. Convenciones HTTP — propuesta, ajustable

Nada de esto está decidido de forma irreversible; es el punto de partida al escribir el primer controller.

- **Recursos:** rutas en plural, kebab-case (`/collection-visits`, no `/collectionVisits`).
- **Respuestas de éxito:** el recurso o colección directo, sin envelope (`{ id, ... }` o `[{ ... }]`). Para listas paginadas, un envelope mínimo: `{ data: [...], meta: { page, pageSize, total } }`.
- **Errores:** filtro de excepción global que responde `{ statusCode, message, code, path, timestamp }`, donde `code` es un string estable (`LOAN_NOT_FOUND`, `SUBSCRIPTION_INACTIVE`) pensado para que `web`/`mobile` lo usen en lugar de parsear `message`.
- **Validación:** `ValidationPipe` global con `whitelist: true, forbidNonWhitelisted: true, transform: true`. DTOs con `class-validator` + `class-transformer`, uno por caso de uso (no reutilizar el mismo DTO para create/update si los campos requeridos difieren).
- **Versionado de API:** sin decidir todavía — evaluar `URI Versioning` de Nest (`/v1/...`) si `mobile` empieza a quedarse en versiones viejas del backend (ver estrategia de `runtimeVersion` en la app móvil).

## 6. Autenticación y autorización

- JWT + refresh token para los 3 roles (Owner, Lender, Collector) — implementado en `modules/auth`.
- `LenderScopeGuard` (en `shared/guards`): extrae `lenderId` del JWT, nunca del body/query. Si el rol es `COLLECTOR`, valida además que el recurso pertenezca a sus `assignedClientIds`.
- `SubscriptionGuard`: bloquea `POST/PUT/PATCH/DELETE` cuando la suscripción del Tenant no está activa (modo solo lectura). Pendiente de definir el período de gracia — ver documento de producto, sección 7.
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
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Firma de tokens | Pendiente |
| `SENTRY_DSN` | Errores en producción | Pendiente |
| `PORT` | Puerto HTTP | Pendiente (Nest usa `3000` por defecto) |

## 9. Ramas y CI

Ver el `README.md` de este repo para el flujo de ramas (`dev`/`main`) y el pipeline de CI. Este documento cubre solo arquitectura de código.
