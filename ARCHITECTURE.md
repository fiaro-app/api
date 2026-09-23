# Arquitectura técnica — `api`

> Documento de referencia para quien escriba código en este repo (incluido tú mismo en 3 meses). Cubre **cómo** se construye el backend: estructura de carpetas, convenciones, reglas de dependencia y herramientas. Para el **qué** y el **por qué** de producto (dominio, entidades, multi-tenancy, roadmap), ver [PRODUCT.md](./PRODUCT.md).
>
> Estado: la estructura, las herramientas y las reglas de este documento están instaladas y verificadas. La lógica de negocio se construye funcionalidad por funcionalidad; cada pieza nueva sigue lo que se describe aquí.

## 1. Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | NestJS 12 (TypeScript 6.0, `strict`) | TypeScript fijado en `~6.0.3`: es el más nuevo que soporta typescript-eslint |
| Runtime | Node 24 LTS, pnpm 11 | Versión en `.nvmrc` y `engines`; `packageManager` fijado en `package.json` |
| Contratos | `@fiaro-app/contracts` | Schemas de Zod, tipos y endpoints compartidos con las apps |
| ORM | Prisma (se instala con el esquema) | Nunca se expone el tipo generado por Prisma fuera de `infrastructure` — ver sección 4 |
| Base de datos | PostgreSQL (Neon) | |
| Cache / colas | Redis (Upstash) + BullMQ | |
| Auditoría | MongoDB Atlas | Solo eventos, nunca datos transaccionales del crédito |
| Lint | ESLint 10 + typescript-eslint (reglas con tipos) + eslint-plugin-boundaries | `pnpm lint` — ver secciones 3 y 8 |
| Formato | Prettier | `pnpm format`, `pnpm format:check` |
| Test | Vitest 5 con SWC (unit + e2e), cobertura v8 | `pnpm test`, `pnpm test:cov`, `pnpm test:e2e` — ver sección 7 |
| Hooks de git | Husky + lint-staged + commitlint | Ver sección 8 |
| Docs | Compodoc | `pnpm docs` → `docs/` (no se commitea, se publica como artefacto de CI) |
| Análisis estático | SonarQube Cloud (CI-based) | Quality gate: 80 % de cobertura en código nuevo |
| Despliegue | Fly.io (Docker) | `Dockerfile` y `fly.toml` se agregan con el primer despliegue |

## 2. Estructura de carpetas

Capas arriba y, dentro de las carpetas que crecen, una subcarpeta por funcionalidad (`loans`, `clients`, `collections`...):

```
src/
  main.ts                    # Arranca la aplicación
  app.module.ts              # Raíz de composición: importa los módulos de infrastructure/modules
  domain/                    # Reglas de negocio puras — cero dependencias externas
    entities/                #   loans/loan.entity.ts
    value-objects/           #   money.value-object.ts, phone.value-object.ts
    enums/                   #   loans/loan-status.enum.ts
    errors/                  #   loans/loan-already-paid.error.ts
    policies/                #   loans/loan-cancellation.policy.ts
    repositories/            #   loans/loan.repository.ts (interfaz)
    tokens/                  #   loans/loan-repository.token.ts (token de inyección)
    audit/                   #   Eventos de auditoría del dominio
  application/               # Casos de uso: orquestan el dominio a través de puertos
    use-cases/               #   loans/create-loan.use-case.ts
    services/                #   Lógica compartida entre varios casos de uso
    dtos/                    #   loans/create-loan.dto.ts (entrada y salida de un caso de uso)
    ports/                   #   email-sender.port.ts, clock.port.ts (interfaces hacia afuera)
    events/                  #   payments/payment-registered.event.ts y sus handlers
    security/                #   Reglas de autorización: qué rol puede hacer qué sobre qué recurso
    audit/                   #   Puerto y servicio para registrar auditoría desde los casos de uso
  infrastructure/            # Adaptadores: todo lo que habla con el framework o el mundo exterior
    modules/                 #   loans.module.ts — une controllers, casos de uso y adaptadores
    controllers/             #   loans/loans.controller.ts; common/ para guards, pipes y decoradores HTTP
    persistence/             #   prisma/ (schema, cliente) y loans/prisma-loan.repository.ts + mapper
    filters/                 #   Filtro global de excepciones → ApiError de contracts
    crypto/                  #   Hashing y cifrado
    notifications/           #   Email (Resend), WhatsApp (Twilio)
    messaging/               #   Colas (BullMQ)
    store/                   #   Cache y almacenamiento clave-valor (Redis)
    audit/                   #   Adaptador de auditoría (MongoDB)
    metrics/                 #   Métricas y observabilidad
    maintenance/             #   Modo mantenimiento (503 MAINTENANCE)
    swagger/                 #   Documentación OpenAPI
    i18n/                    #   Adaptador de traducciones
  config/                    # Lectura y validación de variables de entorno
  i18n/                      # Archivos de traducción
test/
  *.e2e-spec.ts              # Pruebas e2e, una suite por flujo de negocio
```

Las carpetas vacías llevan un `.gitkeep` para que git las conserve; se borra al agregar el primer archivo. Las subcarpetas por funcionalidad se crean con su primer archivo.

**Nombres de archivo:** kebab-case con un sufijo que dice qué es: `.entity.ts`, `.value-object.ts`, `.enum.ts`, `.error.ts`, `.policy.ts`, `.repository.ts` (interfaz en `domain`), `.token.ts`, `.use-case.ts`, `.service.ts`, `.dto.ts`, `.port.ts`, `.event.ts`, `.controller.ts`, `.module.ts`, `.mapper.ts`, `.filter.ts`, `.guard.ts`, `.pipe.ts`. Los adaptadores llevan el nombre de la tecnología: `prisma-loan.repository.ts`, `resend-email-sender.ts`.

**`dtos` y `contracts`:** los requests y respuestas HTTP vienen de `@fiaro-app/contracts`. Los `dtos` de `application` son la entrada y salida de cada caso de uso, independientes de HTTP: el controller traduce del contrato al DTO del caso de uso.

**`tokens`:** en TypeScript las interfaces desaparecen al compilar, así que NestJS no puede inyectar un `LoanRepository` por su tipo. Cada puerto o repositorio tiene un token (`Symbol`) en `domain/tokens` con el que se registra y se inyecta la implementación.

## 3. Regla de dependencia (obligatoria, forzada por lint)

Cada capa solo puede importar lo que le corresponde. ESLint falla si se rompe la regla (`eslint-plugin-boundaries`, configurado en `eslint.config.js`):

| Capa | Puede importar de | Librerías externas |
|---|---|---|
| `domain` | `domain` | Ninguna |
| `application` | `domain`, `application` | Solo `@nestjs/common` (inyección de dependencias) y `@fiaro-app/contracts` |
| `infrastructure` | Todas las capas | Todas, y módulos de Node |
| `config` | `config` | Todas, y módulos de Node |
| Raíz (`main.ts`, `app.module.ts`) | Todas las capas | Todas, y módulos de Node |

```
infrastructure → application → domain
infrastructure ───────────────→ domain
```

**Por qué:** el dominio (las reglas del negocio) no debe depender de NestJS, de Prisma ni de ninguna librería. Así se prueba sin levantar nada, y cambiar de base de datos o de framework no toca las reglas del negocio. Las pruebas (`*.spec.ts`) están exentas: pueden importar Vitest y las utilidades de prueba de Nest.

La regla se verificó con archivos de prueba en cada capa: bloquea `domain → infrastructure`, `domain → @nestjs/common`, `application → infrastructure`, `application → express` y `config → domain`, y permite las importaciones válidas.

## 4. Prisma sin ensuciar el dominio

Prisma genera su propio cliente tipado, pero ese tipo **no es la entidad de dominio**. La traducción es explícita, siempre en `infrastructure`, vía un mapper:

- `domain/entities/<módulo>/<entidad>.entity.ts` — clase plana, constructor privado + factory (`reconstitute`, `create`), sin decoradores, sin imports de Prisma ni de Nest.
- `domain/repositories/<módulo>/<entidad>.repository.ts` — la interfaz (el puerto) que usan los casos de uso.
- `infrastructure/persistence/<módulo>/<entidad>.mapper.ts` — `toDomain(record: PrismaX): X` y `toPersistence(entity: X): Prisma.XCreateInput`.
- `infrastructure/persistence/<módulo>/prisma-<entidad>.repository.ts` — implementa la interfaz, inyecta `PrismaService`, usa el mapper.

Ejemplo completo en el documento de producto, sección 4.3.

## 5. Convenciones HTTP

Los schemas de cada request y respuesta, y la definición de cada endpoint (método, ruta, body, respuesta), viven en el paquete `@fiaro-app/contracts` (D-30). Esta sección fija cómo la API los aplica.

- **Recursos:** rutas en plural, kebab-case (`/collection-visits`, no `/collectionVisits`).
- **Lecturas con filtros — método `QUERY`:** las consultas con filtros combinables, rangos de fechas, ordenamiento o paginación usan el método HTTP `QUERY` (RFC de la IETF *"The HTTP QUERY Method"*) con el criterio en el **body JSON**, en lugar de `GET` con query string. `QUERY` es seguro e idempotente como `GET`, pero el filtro viaja tipado y validado por un schema de Zod de `contracts`, no queda en logs de acceso ni tiene límite de longitud de URL.
  - `GET` se reserva para lecturas por identificador o sin criterio (`GET /clients/:id`, `GET /collectors/me`).
  - `QUERY` para búsquedas y reportes: `QUERY /lenders/me/stats`, `QUERY /clients`, `QUERY /daily-settlements`, `QUERY /collectors/me/route`.
  - El body de un `QUERY` es un schema de `contracts` por caso de uso (`LoanStatsQuerySchema`, `ClientSearchQuerySchema`); si pagina, extiende `PageQuerySchema`, que ya trae los defaults de `page` y `pageSize`.
  - Soporte de plataforma: Node 24 incluye `QUERY` en `http.METHODS`; se expone en Nest con un decorador propio (`@QueryMethod(path)`) en `infrastructure/controllers/common`. `fetch` en Expo y Next acepta el método tal cual. Por ser un método no simple, el navegador hace preflight CORS: `QUERY` debe estar en `Access-Control-Allow-Methods`.
- **Respuestas de éxito:** el recurso o colección directo, sin envelope (`{ id, ... }` o `[{ ... }]`). Para listas paginadas, un envelope mínimo: `{ data: [...], meta: { page, pageSize, total } }`.
- **Formato de datos:** JSON en camelCase (Prisma traduce a `snake_case` con `@map`), fechas de calendario `AAAA-MM-DD`, marcas de tiempo ISO 8601 con zona horaria, dinero en enteros y `null` explícito en las respuestas (D-31). Razones en el README de `contracts`.
- **Errores:** filtro de excepción global (`infrastructure/filters`) que responde `ApiErrorSchema`: `{ statusCode, code, message, path, timestamp, issues }`. `code` es un string estable que las apps usan en lugar de parsear `message`: los generales están en `ErrorCodeSchema` (`VALIDATION_FAILED`, `SUBSCRIPTION_READ_ONLY`...) y cada módulo agrega los suyos (`LOAN_NOT_FOUND`). `issues` trae el detalle por campo cuando el código es `VALIDATION_FAILED`; en los demás casos es `null`. Los errores de `domain/errors` se traducen a su código HTTP en ese filtro.
- **Validación:** con los schemas de Zod de `contracts`, no con DTOs de class-validator: el contrato es la única fuente de verdad. Un pipe propio (`ZodValidationPipe`, en `infrastructure/controllers/common`) valida los parámetros de ruta y el body contra la definición del endpoint. Los bodies son `z.strictObject`, así que un campo desconocido responde `400 VALIDATION_FAILED` en lugar de ignorarse.
- **Compatibilidad con apps viejas:** las rutas no llevan prefijo de versión. Los cambios a la API son aditivos, los schemas de respuesta de `contracts` ignoran campos desconocidos y el version-gate (`GET /mobile/version`) bloquea las apps por debajo de `minimumSupportedVersion`. Un cambio incompatible sube esa versión mínima en el mismo despliegue.

## 6. Autenticación y autorización

- **Autenticación con better-auth** (adaptador Prisma, login teléfono + contraseña, sesiones revocables), registrada en `infrastructure/modules/auth.module.ts` — es un adaptador, el dominio no conoce better-auth. Sujeto a spike; plan B: JWT + refresh con Passport. Ver PRODUCT.md §8 y D-08.
- **Roles por membership**: `User` ↔ `Lender` con un conjunto de roles (`OWNER`, `LENDER`, `COLLECTOR`); los guards evalúan el conjunto, no un rol único (D-02).
- **Reglas de autorización** en `application/security`: funciones puras (qué rol puede hacer qué sobre qué recurso), usadas por los guards y por los casos de uso.
- `LenderScopeGuard` (en `infrastructure/controllers/common`): toma `lenderId` de la membership activa de la sesión, nunca del body/query. En modo cobrador valida además que el préstamo tenga una `CollectionAssignment` vigente para esa membership.
- `SubscriptionGuard`: bloquea `POST`, `PATCH` y `DELETE` cuando la suscripción del Tenant está en solo lectura; las lecturas (`GET` y `QUERY`) siguen funcionando y la respuesta de error usa el código `SUBSCRIPTION_READ_ONLY`. Gracia de 7 días; después solo lectura **excepto** registrar visitas/pagos (D-21).
- Row Level Security de Postgres como segunda capa — se define junto con el esquema de Prisma, no reemplaza al guard de aplicación.

## 7. Testing

- **Unitarios:** `*.spec.ts` junto al archivo que prueban (`loan.entity.spec.ts` junto a `loan.entity.ts`). Importan `describe`, `it` y `expect` desde `vitest`: no hay variables globales de prueba en el código de producción.
- **Dominio primero:** la lógica de `domain` y `application` se prueba sin `TestingModule` de Nest ni base de datos, con implementaciones en memoria de los puertos. Son las pruebas que más abundan y deben correr en milisegundos: es lo que mantiene la suite rápida cuando el proyecto crece.
- **E2E:** en `test/*.e2e-spec.ts`, uno por flujo de negocio relevante (no uno por endpoint), con `Test.createTestingModule` de Nest y `supertest`. Configuración separada (`vitest.config.e2e.ts`): no se mezclan con las unitarias en `pnpm test`.
- **SWC:** las pruebas se compilan con SWC (`unplugin-swc`), la configuración que recomienda NestJS para Vitest. Emite la metadata de decoradores que necesita la inyección de dependencias, y la cobertura de Vitest reconoce ese código generado y no lo cuenta como ramas sin probar.
- **Cobertura:** `pnpm test:cov` exige al menos 80 % de líneas, funciones, ramas y sentencias, el mismo mínimo que la quality gate de SonarCloud. `main.ts` y los `*.module.ts` quedan fuera: solo arman la aplicación y los cubren las pruebas e2e.

## 8. Herramientas, hooks y caché

**Hooks de git** (Husky), para que los problemas aparezcan antes del CI:

| Hook | Qué hace |
|---|---|
| `pre-commit` | lint-staged: ESLint con `--fix`, Prettier y `vitest related` **solo sobre los archivos en staging**. El tiempo del commit depende del cambio, no del tamaño del proyecto |
| `commit-msg` | commitlint: el mensaje debe seguir Conventional Commits (`feat:`, `fix:`, `docs:`...) |
| `pre-push` | Typecheck incremental y solo las pruebas afectadas por los cambios de la rama frente a `dev` (`vitest --changed`). El CI corre todo |

**Caché** (en `node_modules/.cache`, también guardada entre ejecuciones del CI):

| Herramienta | Qué reutiliza | ¿Segura? |
|---|---|---|
| TypeScript | Estado incremental del typecheck (`--tsBuildInfoFile`) | Sí: TypeScript compara el contenido de cada archivo |
| Prettier | Archivos ya formateados (`--cache`) | Sí: compara contenido y configuración |
| Vitest | Orden de ejecución por duración y fallos previos | Sí: no cambia resultados |
| ESLint | **No se cachea** | Su caché guarda el resultado por archivo y no detecta cambios de tipos en otros archivos; con reglas que usan tipos daría resultados viejos. La velocidad viene de lint-staged, que solo revisa lo que cambió |

**Scripts de instalación de terceros:** pnpm 11 no los ejecuta salvo autorización explícita en `pnpm-workspace.yaml` (`allowBuilds`). `@swc/core` y `unrs-resolver` quedan desactivados: solo verifican un binario nativo que ya llega como dependencia opcional.

**Período de espera de pnpm:** pnpm 11 no instala versiones publicadas hace menos de un día, como protección contra paquetes comprometidos. El scope `@fiaro-app` queda exento (`minimumReleaseAgeExclude`) para instalar `contracts` apenas se publica.

## 9. Variables de entorno

Ninguna está conectada todavía. Cada una se agrega junto con la pieza que la usa, validada en `config/` al arrancar, y se documenta en `.env.example` (nunca `.env` real, ver `.gitignore`) y aquí:

| Variable | Para qué | Se agrega con |
|---|---|---|
| `DATABASE_URL` | Conexión Postgres (Neon) vía Prisma | Esquema de base de datos |
| `REDIS_URL` | Cache + broker de BullMQ (Upstash) | Colas y caché |
| `MONGODB_URI` | Auditoría | Auditoría |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Firma de sesiones de better-auth | Autenticación |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Storage de archivos (Cloudflare R2) | Logo del prestamista |
| `SENTRY_DSN` | Errores en producción | Primer despliegue |
| `PORT` | Puerto HTTP (Nest usa `3000` por defecto) | Primer despliegue |

## 10. Ramas y CI

Ver el `README.md` de este repo para el flujo de ramas (`dev`/`main`) y el pipeline de CI. Este documento cubre solo arquitectura de código.
