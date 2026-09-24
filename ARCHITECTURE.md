# Arquitectura técnica — `api`

> Documento de referencia para quien escriba código en este repo (incluido tú mismo en 3 meses). Cubre **cómo** se construye el backend: estructura de carpetas, convenciones, reglas de dependencia y herramientas. Para el **qué** y el **por qué** de producto (dominio, entidades, multi-tenancy, roadmap), ver [PRODUCT.md](./PRODUCT.md).
>
> Estado: la estructura, las herramientas y las reglas de este documento están instaladas y verificadas. La lógica de negocio se construye funcionalidad por funcionalidad; cada pieza nueva sigue lo que se describe aquí.

## 1. Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | NestJS 12 (TypeScript 6.0, `strict`) | TypeScript fijado en `~6.0.3`: es el más nuevo que soporta typescript-eslint |
| Runtime | Node 24 LTS, pnpm 11 | Versión en `.nvmrc` y `engines`; `packageManager` fijado en `package.json` |
| Contratos | `@fiaro-app/contracts` | Schemas de Zod, tipos y endpoints compartidos con las apps. Paquete privado en GitHub Packages: el acceso está en el README |
| Validación y docs de la API | Schemas de Zod (Standard Schema) + `@nestjs/swagger` | El pipe de validación y la documentación OpenAPI salen de los mismos schemas — ver secciones 5 y 11 |
| Seguridad HTTP | Helmet, CORS, `cookie-parser`, `@nestjs/throttler` | Se configura antes del primer endpoint — ver sección 11 |
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
| Entorno local | Docker Compose (OrbStack o Docker Desktop) | Postgres, Redis, Mongo, S3, Mailpit y la API con recarga en caliente; observabilidad opcional — ver sección 12 |
| Despliegue | Fly.io (Docker) | El `Dockerfile` ya existe (target `prod`); `fly.toml` se agrega con el primer despliegue |

## 2. Estructura de carpetas

Un módulo por funcionalidad del dominio, cada uno con su propia arquitectura hexagonal (`domain`, `application`, `infrastructure`). Lo que usan todos los módulos vive en `shared`, con las mismas tres capas:

```
src/
  main.ts                        # Arranca la aplicación
  app.module.ts                  # Raíz de composición: registra los módulos y el rate limit
  app.setup.ts                   # Configuración HTTP global: seguridad, versionado, validación y docs (§11)
  modules/
    <módulo>/                    # system, auth, tenants, subscriptions, lenders, memberships,
                                 # clients, loans, collections, payments, settlements, notifications
      <módulo>.module.ts         # Módulo de NestJS: une las capas del módulo
      domain/                    # Reglas de negocio puras — cero dependencias externas
        entities/                #   loan.entity.ts
        value-objects/           #   installment-plan.value-object.ts
        enums/                   #   loan-status.enum.ts
        errors/                  #   loan-already-paid.error.ts
        policies/                #   loan-cancellation.policy.ts
        repositories/            #   loan.repository.ts (interfaz)
        tokens/                  #   loan-repository.token.ts (token de inyección)
      application/               # Casos de uso: orquestan el dominio a través de puertos
        use-cases/               #   create-loan.use-case.ts
        services/                #   Lógica compartida entre casos de uso del módulo
        dtos/                    #   create-loan.dto.ts (entrada y salida de un caso de uso)
        ports/                   #   Interfaces hacia afuera propias del módulo
        events/                  #   loan-created.event.ts y sus handlers
      infrastructure/            # Adaptadores del módulo
        controllers/             #   loans.controller.ts
        persistence/             #   prisma-loan.repository.ts, loan.mapper.ts
  shared/                        # Código transversal, con las mismas tres capas
    domain/
      value-objects/             #   money, phone, national-id, business-date
      errors/                    #   DomainError base
      audit/                     #   Eventos de auditoría
    application/
      ports/                     #   clock.port.ts, id-generator.port.ts, email-sender.port.ts
      security/                  #   Reglas de autorización: qué rol puede hacer qué sobre qué recurso
      audit/                     #   Puerto y servicio para registrar auditoría
    infrastructure/
      persistence/               #   Esquema y cliente de Prisma (PrismaService)
      http/                      #   Pipes, middlewares y opciones HTTP (SchemaValidationPipe, cabeceras de seguridad, CORS, versionado)
      filters/                   #   Filtro global de excepciones → ApiError de contracts
      crypto/                    #   Hashing y cifrado
      notifications/             #   Email (Resend), WhatsApp (Twilio)
      messaging/                 #   Colas (BullMQ)
      store/                     #   Cache y almacenamiento clave-valor (Redis)
      audit/                     #   Adaptador de auditoría (MongoDB)
      metrics/                   #   Métricas y observabilidad
      maintenance/               #   Modo mantenimiento (503 MAINTENANCE)
      swagger/                   #   Documentación OpenAPI
      i18n/                      #   Adaptador de traducciones
  config/                        # Lectura y validación de variables de entorno (env.ts, env.module.ts, env.token.ts)
  i18n/                          # Archivos de traducción
test/
  *.e2e-spec.ts                  # Pruebas e2e, una suite por flujo de negocio
```

**Carpetas que se crean con su primer archivo.** Cada módulo nace con sus tres capas. Las subcarpetas del árbol (`entities`, `use-cases`, `controllers`...) aparecen cuando el módulo las necesita: no todos los módulos usan todas, y crearlas de antemano serían unas 170 carpetas vacías. Las carpetas vacías llevan un `.gitkeep` para que git las conserve; se borra al agregar el primer archivo.

**Nombres de archivo:** kebab-case con un sufijo que dice qué es: `.entity.ts`, `.value-object.ts`, `.enum.ts`, `.error.ts`, `.policy.ts`, `.repository.ts` (interfaz en `domain`), `.token.ts`, `.use-case.ts`, `.service.ts`, `.dto.ts`, `.port.ts`, `.event.ts`, `.controller.ts`, `.module.ts`, `.mapper.ts`, `.filter.ts`, `.guard.ts`, `.pipe.ts`, `.middleware.ts`, `.options.ts`, `.setup.ts`. Los adaptadores llevan el nombre de la tecnología: `prisma-loan.repository.ts`, `resend-email-sender.ts`.

**`dtos` y `contracts`:** los requests y respuestas HTTP vienen de `@fiaro-app/contracts`. Los `dtos` de `application` son la entrada y salida de cada caso de uso, independientes de HTTP: el controller traduce del contrato al DTO del caso de uso.

**`tokens`:** en TypeScript las interfaces desaparecen al compilar, así que NestJS no puede inyectar un `LoanRepository` por su tipo. Cada puerto o repositorio tiene un token (`Symbol`) con el que se registra y se inyecta la implementación.

**Comentarios:** solo TSDoc (`/** */`) y solo sobre lo que importa: comportamiento no obvio, contratos y flujos donde el orden importa (con `@remarks`). Nada de comentarios `//` que narren el código ni que expliquen el porqué de una decisión: eso va en este documento y en PRODUCT.md. En las pruebas, el nombre del `it()` es la explicación.

## 3. Regla de dependencia (obligatoria, forzada por lint)

Cada capa solo puede importar lo que le corresponde. ESLint falla si se rompe la regla (`eslint-plugin-boundaries`, configurado en `eslint.config.js`). El plugin captura el nombre del módulo desde la ruta (`src/modules/<módulo>/...`), así que distingue el módulo propio de los ajenos:

| Quién importa | Puede importar de | Librerías externas |
|---|---|---|
| `domain` de un módulo | `domain` de su módulo, `shared/domain` | Ninguna |
| `application` de un módulo | `domain` de su módulo; `application` de cualquier módulo; `shared/domain` y `shared/application` | Solo `@nestjs/common` (inyección de dependencias) y `@fiaro-app/contracts` |
| `infrastructure` de un módulo | Las tres capas de su módulo, `shared`, `config`, `i18n` | Todas, y módulos de Node |
| `<módulo>.module.ts` | Las capas de su módulo, otros `*.module.ts`, `shared/infrastructure`, `config` | Todas, y módulos de Node |
| `shared/<capa>` | Las mismas reglas de capas dentro de `shared`; nunca un módulo | Como su capa equivalente |
| `config` | `config` | Todas, y módulos de Node |
| Raíz (`main.ts`, `app.module.ts`) | Módulos, `shared/infrastructure`, `config`, `i18n` | Todas, y módulos de Node |

```
infrastructure → application → domain        (dentro de cada módulo)
módulo A: application → módulo B: application (entre módulos, solo por sus casos de uso)
módulos → shared                              (shared nunca depende de un módulo)
```

**Por qué:**
- El dominio (las reglas del negocio) no depende de NestJS, de Prisma ni de ninguna librería: se prueba sin levantar nada, y cambiar de base de datos o de framework no toca las reglas del negocio.
- Un módulo no conoce el dominio de otro: usa sus casos de uso. Así cada módulo puede cambiar su modelo interno sin romper a los demás, y los agregados se referencian por ID.
- `shared` es la base común: si dependiera de un módulo, cualquier cambio en ese módulo afectaría a todos.

Las pruebas (`*.spec.ts`) están exentas: pueden importar Vitest y las utilidades de prueba de Nest.

La regla se verificó con archivos de prueba en dos módulos, en `shared` y en `config`: 19 de 19 casos se comportan como se espera (por ejemplo, bloquea `loans/domain → clients/domain`, `loans/application → clients/domain`, `loans/domain → @nestjs/common` y `shared → loans`, y permite `loans/application → clients/application`).

## 4. Prisma sin ensuciar el dominio

Prisma genera su propio cliente tipado, pero ese tipo **no es la entidad de dominio**. La traducción es explícita, siempre en `infrastructure`, vía un mapper:

- `modules/<módulo>/domain/entities/<entidad>.entity.ts` — clase plana, constructor privado + factory (`reconstitute`, `create`), sin decoradores, sin imports de Prisma ni de Nest.
- `modules/<módulo>/domain/repositories/<entidad>.repository.ts` — la interfaz (el puerto) que usan los casos de uso.
- `modules/<módulo>/infrastructure/persistence/<entidad>.mapper.ts` — `toDomain(record: PrismaX): X` y `toPersistence(entity: X): Prisma.XCreateInput`.
- `modules/<módulo>/infrastructure/persistence/prisma-<entidad>.repository.ts` — implementa la interfaz, inyecta `PrismaService` (de `shared/infrastructure/persistence`), usa el mapper.

Ejemplo completo en el documento de producto, sección 4.3.

## 5. Convenciones HTTP

Los schemas de cada request y respuesta, y la definición de cada endpoint (método, ruta, body, respuesta), viven en el paquete `@fiaro-app/contracts` (D-30). Esta sección fija cómo la API los aplica.

- **Recursos:** rutas en plural, kebab-case (`/collection-visits`, no `/collectionVisits`).
- **Lecturas con filtros — método `QUERY`:** las consultas con filtros combinables, rangos de fechas, ordenamiento o paginación usan el método HTTP `QUERY` (RFC de la IETF *"The HTTP QUERY Method"*) con el criterio en el **body JSON**, en lugar de `GET` con query string. `QUERY` es seguro e idempotente como `GET`, pero el filtro viaja tipado y validado por un schema de Zod de `contracts`, no queda en logs de acceso ni tiene límite de longitud de URL.
  - `GET` se reserva para lecturas por identificador o sin criterio (`GET /clients/:id`, `GET /collectors/me`).
  - `QUERY` para búsquedas y reportes: `QUERY /lenders/me/stats`, `QUERY /clients`, `QUERY /daily-settlements`, `QUERY /collectors/me/route`.
  - El body de un `QUERY` es un schema de `contracts` por caso de uso (`LoanStatsQuerySchema`, `ClientSearchQuerySchema`); si pagina, extiende `PageQuerySchema`, que ya trae los defaults de `page` y `pageSize`.
  - Soporte de plataforma: Node 24 incluye `QUERY` en `http.METHODS` y NestJS 12 lo expone como `@QueryMethod(path)` (`@nestjs/common`). `fetch` en Expo y Next acepta el método tal cual. Por ser un método no simple, el navegador hace preflight CORS: `QUERY` está en `CORS_METHODS` (`shared/infrastructure/http/cors.options.ts`) y una prueba e2e lo verifica. Swagger UI documenta las rutas `QUERY` pero no permite ejecutarlas desde la interfaz.
- **Respuestas de éxito:** el recurso o colección directo, sin envelope (`{ id, ... }` o `[{ ... }]`). Para listas paginadas, un envelope mínimo: `{ data: [...], meta: { page, pageSize, total } }`.
- **Formato de datos:** JSON en camelCase (Prisma traduce a `snake_case` con `@map`), fechas de calendario `AAAA-MM-DD`, marcas de tiempo ISO 8601 con zona horaria, dinero en enteros y `null` explícito en las respuestas (D-31). Razones en el README de `contracts`.
- **Errores:** filtro de excepción global (`shared/infrastructure/filters`) que responde `ApiErrorSchema`: `{ statusCode, code, message, path, timestamp, issues }`. `code` es un string estable que las apps usan en lugar de parsear `message`: los generales están en `ErrorCodeSchema` (`VALIDATION_FAILED`, `SUBSCRIPTION_READ_ONLY`...) y cada módulo agrega los suyos (`LOAN_NOT_FOUND`). `issues` trae el detalle por campo cuando el código es `VALIDATION_FAILED`; en los demás casos es `null`. Los errores de dominio (`DomainError` y sus subclases) se traducen a su código HTTP en ese filtro. **Estado:** el filtro todavía no existe; hoy la validación responde `{ code: 'VALIDATION_FAILED', message, issues }` y el rate limit `{ statusCode, message }`. El filtro los completará con `statusCode`, `path`, `timestamp` y el código `RATE_LIMITED`.
- **Validación:** con los schemas de Zod de `contracts`, no con DTOs de class-validator: el contrato es la única fuente de verdad. Cada parámetro declara su schema (`@Body({ schema: CreateLoanSchema })`, `@Param({ data: 'id', schema })`) y el pipe global `SchemaValidationPipe` (`shared/infrastructure/http`) lo valida. Está construido sobre el `StandardSchemaValidationPipe` de NestJS 12, así que no hace falta una librería de terceros (`nestjs-zod` no soporta Nest 12). Los bodies son `z.strictObject`, así que un campo desconocido responde `400 VALIDATION_FAILED` en lugar de ignorarse. Un `@Body()` o `@Query()` **sin schema** es un error de programación y responde 500: el pipe de Nest lo dejaría pasar sin validar en silencio, y un olvido así abriría la puerta a datos sin revisar. Ver sección 11.
- **Versionado y compatibilidad con apps viejas:** las rutas **no llevan prefijo de versión** (`/clients/:id`, igual que en `contracts`): la versión se elige con la cabecera `API-Version` y, si falta, se sirve la versión `1`, que es la que usan las apps ya instaladas. Los cambios aditivos (un campo o una ruta nueva) no cambian la versión: los schemas de respuesta de `contracts` ignoran campos desconocidos. Un cambio incompatible crea la versión 2 **junto a** la 1: las apps nuevas envían `API-Version: 2` y las instaladas siguen igual, sin cabecera. La versión 1 se retira cuando el version-gate (`GET /mobile/version`) ya bloquea a las apps por debajo de `minimumSupportedVersion` que la usan. Las rutas de infraestructura (`/health`, `/mobile/version`) son `VERSION_NEUTRAL`: responden con cualquier versión y siguen alcanzables aunque una se retire. Una versión que la ruta no tiene responde 404. Ver sección 11 (D-41).

## 6. Autenticación y autorización

- **Autenticación con better-auth** (adaptador Prisma, login teléfono + contraseña, sesiones revocables), registrada en `modules/auth/auth.module.ts` — es un adaptador, el dominio no conoce better-auth. Sujeto a spike; plan B: JWT + refresh con Passport. Ver PRODUCT.md §8 y D-08.
- **Roles por membership**: `User` ↔ `Lender` con un conjunto de roles (`OWNER`, `LENDER`, `COLLECTOR`); los guards evalúan el conjunto, no un rol único (D-02).
- **Reglas de autorización** en `shared/application/security`: funciones puras (qué rol puede hacer qué sobre qué recurso), usadas por los guards y por los casos de uso.
- `LenderScopeGuard` (en `shared/infrastructure/http`): toma `lenderId` de la membership activa de la sesión, nunca del body/query. En modo cobrador valida además que el préstamo tenga una `CollectionAssignment` vigente para esa membership.
- `SubscriptionGuard`: bloquea `POST`, `PATCH` y `DELETE` cuando la suscripción del Tenant está en solo lectura; las lecturas (`GET` y `QUERY`) siguen funcionando y la respuesta de error usa el código `SUBSCRIPTION_READ_ONLY`. Gracia de 7 días; después solo lectura **excepto** registrar visitas/pagos (D-21).
- Row Level Security de Postgres como segunda capa — se define junto con el esquema de Prisma, no reemplaza al guard de aplicación.

## 7. Testing

- **Unitarios:** `*.spec.ts` junto al archivo que prueban (`loan.entity.spec.ts` junto a `loan.entity.ts`). Importan `describe`, `it` y `expect` desde `vitest`: no hay variables globales de prueba en el código de producción.
- **Dominio primero:** la lógica de `domain` y `application` se prueba sin `TestingModule` de Nest ni base de datos, con implementaciones en memoria de los puertos. Son las pruebas que más abundan y deben correr en milisegundos: es lo que mantiene la suite rápida cuando el proyecto crece.
- **E2E:** en `test/*.e2e-spec.ts`, uno por flujo de negocio relevante (no uno por endpoint), con `Test.createTestingModule` de Nest y `supertest`. Configuración separada (`vitest.config.e2e.ts`): no se mezclan con las unitarias en `pnpm test`. `test/security.e2e-spec.ts` es la excepción a "uno por flujo de negocio": prueba la aplicación ensamblada (`AppModule` + `configureApp`) con rutas de prueba, porque cada protección de la sección 11 puede estar bien por separado y aun así no estar conectada. Se verificó que cada una de esas pruebas falla al quitar su protección.
- **SWC:** las pruebas se compilan con SWC (`unplugin-swc`), la configuración que recomienda NestJS para Vitest. Emite la metadata de decoradores que necesita la inyección de dependencias, y la cobertura de Vitest reconoce ese código generado y no lo cuenta como ramas sin probar.
- **Cobertura:** `pnpm test:cov` exige al menos 80 % de líneas, funciones, ramas y sentencias, el mismo mínimo que la quality gate de SonarCloud. `main.ts`, `app.setup.ts` y los `*.module.ts` quedan fuera: solo arman la aplicación y los cubren las pruebas e2e; los `*.token.ts` también, por ser una constante sin lógica. La misma lista está en `sonar-project.properties` y deben coincidir.
- **En contenedores:** `pnpm docker:test` corre la suite completa (unitarias con cobertura y e2e) dentro de Docker, con la infraestructura efímera de `compose.test.yaml` — ver sección 12.

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

**Scripts de instalación de terceros:** pnpm 11 no los ejecuta salvo autorización explícita en `pnpm-workspace.yaml` (`allowBuilds`). `@swc/core` y `unrs-resolver` quedan desactivados: solo verifican un binario nativo que ya llega como dependencia opcional. `@scarf/scarf` (lo trae `swagger-ui-dist`) también: solo envía telemetría de uso.

**Período de espera de pnpm:** pnpm 11 no instala versiones publicadas hace menos de un día, como protección contra paquetes comprometidos. El scope `@fiaro-app` queda exento (`minimumReleaseAgeExclude`) para instalar `contracts` apenas se publica.

## 9. Variables de entorno

Cada una se agrega junto con la pieza que la usa, validada en `src/config/env.ts` al arrancar (si alguna es inválida el proceso no arranca y el error dice cuál), y se documenta en `.env.example` (nunca `.env` real, ver `.gitignore`) y aquí. En desarrollo se leen de un `.env` local, que Node carga sin dependencias (`process.loadEnvFile`, en `main.ts`); en producción las inyecta la plataforma y no hay archivo.

**Conectadas** (seguridad HTTP, ver sección 11):

| Variable | Por defecto | Para qué |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` o `production` |
| `PORT` | `3000` | Puerto HTTP |
| `CORS_ORIGINS` | vacío | Orígenes (separados por coma, sin barra final) que pueden llamar a la API desde un navegador. Vacío: ninguno |
| `TRUST_PROXY` | `0`; **obligatoria en producción** | Proxies de confianza delante de la API (`1` en Fly.io; `.env.example` la deja en `1`). De ahí sale la IP que cuenta el rate limit |
| `THROTTLE_TTL_MS` | `60000` | Ventana del rate limit, en milisegundos |
| `THROTTLE_LIMIT` | `100` | Peticiones permitidas por IP y por ruta dentro de la ventana |
| `SWAGGER_ENABLED` | activa salvo en producción | Publica la documentación en `/docs` |

**Pendientes** (cada una se agrega con su pieza):

| Variable | Para qué | Se agrega con |
|---|---|---|
| `DATABASE_URL` | Conexión Postgres (Neon) vía Prisma | Esquema de base de datos |
| `REDIS_URL` | Cache + broker de BullMQ (Upstash) | Colas y caché |
| `MONGODB_URI` | Auditoría | Auditoría |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Firma de sesiones de better-auth | Autenticación |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Storage de archivos por API S3: Cloudflare R2 en producción, SeaweedFS en local. Nombres sin el del proveedor: el mismo código sirve para los dos | Logo del prestamista |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Correo saliente (Mailpit en local) | Recuperación de acceso y reportes |
| `SENTRY_DSN` | Errores en producción | Primer despliegue |

En el entorno local con Docker (sección 12) la API ya recibe `DATABASE_URL`, `REDIS_URL`, `MONGODB_URI`, `S3_*` y `SMTP_*` apuntando a los servicios de Compose; se declaran en `src/config/env.ts` cuando el primer módulo las use.

## 10. Ramas y CI

Ver el `README.md` de este repo para el flujo de ramas (`dev`/`main`) y el pipeline de CI. Este documento cubre solo arquitectura de código.

Además del job `check`, el CI tiene un job `docker` que corre en paralelo: valida los archivos de Compose, construye la imagen de producción con el secreto de BuildKit, comprueba que arranca y queda sana, y corre la suite en contenedores (sección 12). Así un `Dockerfile` roto se detecta en el PR y no en el primer despliegue.

## 11. Seguridad HTTP

Todo esto se configura antes del primer endpoint, para que cada ruta nueva lo herede sin que nadie tenga que acordarse (D-40 a D-43). Vive en `src/app.setup.ts` (`configureApp`, que llaman `main.ts` y las pruebas e2e) y el rate limit en `AppModule`. Las piezas están en `shared/infrastructure/{http,swagger}` y la configuración en `config/`.

| Protección | Qué hace | Por qué |
|---|---|---|
| Helmet | Cabeceras de seguridad y política de contenido (CSP) | Reduce lo que un navegador puede hacer con una respuesta de la API |
| CORS | Solo los orígenes de `CORS_ORIGINS` pueden llamar desde un navegador | Evita que una página ajena use la sesión del usuario para leer sus datos |
| `cookie-parser` | Llena `req.cookies` | Lectura de cookies propias; la sesión la manejará la autenticación |
| Rate limit | 100 peticiones por minuto por IP y ruta; 429 al pasarse | Frena la fuerza bruta y el abuso |
| Versionado | Cabecera `API-Version` (sin ella, la versión 1) | Permite cambiar la API sin romper las apps instaladas ni las rutas de `contracts` |
| Validación | Schema de Zod en cada body y parámetro | Nada llega a un caso de uso sin validar |
| Swagger | Documentación en `/docs`, apagada en producción | Documentación viva, sin publicar el mapa de la API donde no hace falta |

### Orden de `configureApp`

El orden es parte del diseño: `trust proxy` → Helmet → `cookie-parser` → CORS → versionado (con `Vary`) → pipe global → Swagger. Helmet va primero para que las cabeceras salgan también en los errores, los 404 y las respuestas de preflight. El rate limit no es un middleware sino un guard global, que corre después de todos ellos: un preflight de CORS se responde antes de llegar a las rutas y nunca gasta el límite.

`configureApp` existe aparte de `main.ts` porque lo que se configura con `app.use()`, `enableCors()` o `useGlobalPipes()` no forma parte de `AppModule`: una prueba que solo importara el módulo probaría una aplicación sin protecciones.

### Helmet: dos políticas de contenido

- **API:** `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. Una respuesta de la API es JSON, nunca una página: si un navegador la interpretara como HTML no podría cargar ni ejecutar nada, y ningún sitio puede meterla en un iframe.
- **`/docs`:** la política por defecto de Helmet, porque Swagger UI carga sus propios scripts y estilos. Sin `upgrade-insecure-requests`: Safari lo aplica también a `http://localhost` y la interfaz deja de cargar.

Además Helmet agrega HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y `Cross-Origin-Resource-Policy: same-origin`, y quita `X-Powered-By` para no anunciar el framework.

### CORS

- **Lista blanca, nunca `*`.** `CORS_ORIGINS` acepta solo orígenes exactos (`https://app.fiaro.co`, sin barra final ni ruta); un comodín o un origen mal escrito impide arrancar. Con la lista vacía no se envía ninguna cabecera CORS.
- **`credentials: true`** para que el panel web envíe la cookie de sesión. Por eso el origen no puede ser `*`: el navegador rechaza esa combinación.
- **CORS protege al usuario, no a la API.** Un cliente que no es navegador (las apps móviles, `curl`) lo ignora, así que no reemplaza a la autenticación.
- `QUERY` está en los métodos permitidos (§5), `API-Version` en las cabeceras permitidas y `maxAge` es de 10 minutos: el navegador recuerda el preflight en lugar de repetirlo en cada petición.

### Rate limit

`@nestjs/throttler` como guard global. Cada respuesta trae `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset`; al pasarse responde 429 con `Retry-After`. Lo que conviene saber:

- **El contador es por IP y por ruta**, no global: agotar `GET /loans` no bloquea `GET /clients`. Sirve para frenar abuso, no para absorber un ataque de denegación de servicio (eso lo hace el borde: Fly.io o un CDN).
- **`TRUST_PROXY` decide de dónde sale la IP.** Detrás de Fly.io, sin ella la IP sería siempre la del proxy y el límite contaría a todos los usuarios como uno; y si se confía de más, cualquiera falsifica `X-Forwarded-For` y evita el límite. Por eso es obligatoria en producción: `1` detrás de Fly.io, `0` si la API recibe tráfico directo. Dos pruebas e2e verifican ambos casos.
- **Rutas sensibles:** el inicio de sesión llevará un límite más estricto con `@Throttle({ default: { limit: 5, ttl: 60_000 } })`, y `/health` llevará `@SkipThrottle()`. Las apps móviles sincronizan de golpe lo registrado sin señal (D-05): deben respetar `Retry-After` en lugar de reintentar de inmediato.
- **Almacén en memoria:** vale mientras haya una sola instancia. Con dos o más, cada una cuenta por su lado y el límite real se multiplica. Al escalar hay que compartirlo (Redis/Upstash) con un `ThrottlerStorage`: `@nest-lab/throttler-storage-redis` 1.2.0 declara soporte solo hasta NestJS 11 (verificado el 2026-09-23), así que hay que revisar su compatibilidad con Nest 12 o implementar la interfaz sobre el cliente de Redis del proyecto.

### Versionado

- **Por cabecera, no por la URL:** `API-Version: 2`. Las rutas no cambian, así que coinciden siempre con las de `contracts` y las apps no necesitan una base de URL distinta por versión. La cabecera no lleva el prefijo `X-`, que el RFC 6648 desaconseja para cabeceras nuevas.
- **Sin cabecera, versión 1.** Las apps instaladas no envían la cabecera y siguen funcionando cuando aparezca la versión 2. Las rutas de la versión 1 **no declaran versión**: heredan la de por defecto; solo las versiones nuevas se declaran.
- **Por qué un extractor propio (`VersioningType.CUSTOM`) y no el tipo `HEADER` de Nest 12.** `HEADER` no aplica `defaultVersion` cuando falta la cabecera: con la configuración "obvia" (`HEADER` + `defaultVersion: '1'`) cada app que no la envía recibiría 404, y una ruta que declara `version: '1'` tampoco respondería sin ella. Está verificado, y una prueba e2e lo protege (ver `shared/infrastructure/http/api-versioning.ts`).
- **Recetas.** Un cambio incompatible: `@Controller({ path: 'loans', version: '2' })` (o `@Version('2')` en un método) crea la versión 2 junto a la 1. Una ruta de infraestructura: `@Controller({ path: 'health', version: VERSION_NEUTRAL })`. Una versión que la ruta no tiene responde 404.
- **Caches y CORS.** La misma URL devuelve contenido distinto según la cabecera, así que cada respuesta lleva `Vary: API-Version` para que ninguna cache entregue la de una versión a quien pidió otra. La cabecera está entre las permitidas de CORS; por ser propia, el navegador hace preflight incluso en un `GET` (lo recuerda 10 minutos).
- **Swagger.** Un documento no puede describir dos versiones de una misma ruta (la última reemplaza a la anterior). Hoy solo existe la versión 1; cuando exista la 2 habrá que generar un documento por versión.

### Validación

- Un campo que el schema no declara → 400. Un `@Body()` o `@Query()` sin schema → 500 (falla cerrado; el mensaje queda en el log, no en la respuesta).
- El pipe de Nest elimina las llaves `__proto__`, `prototype` y `constructor` del dato antes de validar (contaminación de prototipos).
- De cada error solo salen `path` y `message` en `issues`: los schemas agregan más datos (límites, valores recibidos) que no deben salir.

### Documentación (Swagger)

- Publica `/docs` (interfaz) y `/docs/openapi.json` (documento), generados a partir de las rutas y del schema de cada `@Body({ schema })`: no hay nada que mantener a mano.
- **Apagada en producción por defecto** (`SWAGGER_ENABLED`). Describe cada ruta, campo y regla de una API financiera: es información que un atacante aprovecha y que nadie necesita en producción.
- **OpenAPI 3.2.** La 3.0 que Nest usa por defecto no define la operación `query`, y Swagger UI oculta las rutas `QUERY` (D-26), que serán casi todas las lecturas.

### Lo que todavía no está

- **Filtro global de excepciones** que responda `ApiError` (§5).
- **Serializar las respuestas con schema** (`StandardSchemaSerializerInterceptor` y `@SerializeOptions({ schema })` de Nest 12), para que una ruta nunca devuelva campos que el contrato no declara.
- **`Cache-Control: no-store`** en las respuestas con datos personales.

## 12. Entorno local con Docker

Un solo `Dockerfile` (con un target por entorno) y dos archivos de Compose. Todo lo de esta sección es para desarrollo y pruebas: en producción la API corre en Fly.io y la base de datos, el almacenamiento y el correo son servicios administrados (D-44 a D-47).

| Entorno | Definido en | Qué levanta | Comando |
|---|---|---|---|
| Desarrollo | `compose.yaml` + target `dev` | Postgres, Redis, Mongo, S3, Mailpit y la API con recarga en caliente | `pnpm docker:dev` |
| Desarrollo con observabilidad | `compose.yaml`, perfil `observability` | Lo anterior más Prometheus, cAdvisor, Loki, Alloy y Grafana | `pnpm docker:dev:obs` |
| Solo infraestructura | `compose.yaml` | Lo mismo sin la API, para correrla en tu máquina con `pnpm start:dev` | `pnpm docker:infra` |
| Pruebas | `compose.test.yaml` + target `test` | Infraestructura efímera y un contenedor que corre la suite completa | `pnpm docker:test` |
| Producción | target `prod` | Solo la imagen de la API | La construye el CI; Fly.io la usará en el primer despliegue |

`pnpm docker:down` detiene todo y conserva los datos; `pnpm docker:reset` además borra los volúmenes. Los comandos que construyen la imagen (`docker:dev`, `docker:dev:obs` y `docker:test`) toman el token de GitHub Packages de tu sesión de `gh`, o de `NODE_AUTH_TOKEN` si ya lo tienes definido; los demás no lo necesitan.

**`compose.yaml` es el entorno de desarrollo**, así que los comandos de Compose sin opciones (`docker compose ps`, `docker compose logs api`, `docker compose exec api sh`) funcionan sobre lo que estás usando. `compose.test.yaml` no se ejecuta solo: se aplica encima y cambia únicamente lo que unas pruebas necesitan distinto (datos en memoria, otros puertos y el contenedor de pruebas), así las imágenes y las versiones se definen una sola vez. Las versiones exactas están en `compose.yaml`.

### Servicios

| Servicio | Imagen | Puerto en tu máquina | Para qué | En producción |
|---|---|---|---|---|
| `postgres` | `postgres` (Debian) | 5440 | Base de datos transaccional | Neon |
| `redis` | `redis` | 6390 | Caché y colas (BullMQ), con `noeviction` como BullMQ exige | Upstash |
| `mongo` | `mongo` | 27040 | Auditoría | MongoDB Atlas |
| `s3` | `chrislusf/seaweedfs` | 8333 | Almacenamiento de archivos con API S3 | Cloudflare R2 |
| `mailpit` | `axllent/mailpit` | 1025 (SMTP), 8025 (interfaz) | Atrapa los correos que envía la API | Servicio de correo (por definir) |
| `api` | `Dockerfile`, target `dev` | 3040 (HTTP), 9229 (depurador) | La API con recarga en caliente | Fly.io |
| `prometheus` | `prom/prometheus` | 9090 | Guarda y consulta las métricas | — |
| `cadvisor` | `ghcr.io/google/cadvisor` | 8081 | Mide CPU, memoria, red y disco de cada contenedor | — |
| `loki` | `grafana/loki` | 3100 | Guarda y consulta los logs | — |
| `alloy` | `grafana/alloy` | 12345 | Recolecta logs y métricas | — |
| `grafana` | `grafana/grafana` | 3030 | Dashboards | — |

### Puertos y credenciales

- **Solo en `127.0.0.1`:** ningún puerto queda expuesto a la red local.
- **Puertos distintos de los estándar** (5440 en lugar de 5432, 6390 en lugar de 6379, 27040 en lugar de 27017; la API en 3040 y no en 3000): en una máquina con más de un proyecto los estándar suelen estar ocupados y `docker compose up` falla con «port is already allocated». Cada puerto se cambia con una variable en tu shell o en `.env`: `POSTGRES_PORT`, `REDIS_PORT`, `MONGO_PORT`, `S3_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT`, `API_PORT`, `API_DEBUG_PORT`, `PROMETHEUS_PORT`, `CADVISOR_PORT`, `LOKI_PORT`, `ALLOY_PORT` y `GRAFANA_PORT`.
- **Credenciales de desarrollo**, sin valor fuera de tu máquina: Postgres y Mongo `fiaro` / `fiaro` (base `fiaro`); S3 `fiaro` / `fiaro-secret` (bucket `fiaro-dev`); Grafana `admin` / `admin`. Redis y Mailpit no piden credenciales. Se cambian con `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `MONGO_USER`, `MONGO_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` y `GRAFANA_ADMIN_PASSWORD` (sin caracteres especiales: van dentro de URLs de conexión).
- **Postgres y Mongo exigen credenciales aunque sea desarrollo**, como Neon y Atlas: un código que solo funciona sin ellas se descubre en producción.

### Desarrollo (`compose.yaml`, target `dev`)

- **Recarga en caliente:** la API corre con `nest start --watch` y el `src/` de tu máquina está montado dentro (solo lectura): al guardar, se recompila y reinicia en unos 2 segundos. Un cambio en `package.json`, el lockfile o los archivos de configuración exige `pnpm docker:dev` otra vez (reconstruye la imagen).
- **Depurador:** el puerto 9229 está publicado; en VS Code, «Attach» a `localhost:9229` con `remoteRoot` `/app`.
- **Conexiones:** la API recibe `DATABASE_URL`, `REDIS_URL`, `MONGODB_URI`, `S3_*` y `SMTP_*` apuntando a los servicios por su nombre en la red de Compose (`postgres`, `redis`...), y arranca cuando están sanos. Todavía no las lee ningún módulo: están para que el primero que las necesite solo tenga que declararlas en `src/config/env.ts` (sección 9). Desde tu máquina (Prisma Studio, `pnpm start:dev`) se usan los puertos publicados.
- **`.env`:** si existe, se pasa al contenedor; lo que define `compose.yaml` (`NODE_ENV`, `PORT`...) tiene prioridad.
- **Logs sin colores** (`NO_COLOR=1`), para que lleguen limpios a Loki; los que emite el compilador de TypeScript los limpia Alloy.
- **Usuario sin privilegios** (`node`) y `init: true`, para que las señales lleguen al proceso.
- **Por qué la imagen `dev` instala `procps`:** el CLI de Nest reinicia la API matando el proceso anterior con `tree-kill`, que usa `ps`, y la imagen `-slim` no lo trae. El proceso viejo seguía vivo, el nuevo fallaba con `EADDRINUSE` y la API seguía sirviendo el código anterior sin ningún error visible. Se descubrió al verificar la recarga.

### Pruebas (`compose.test.yaml`, target `test`)

- **Datos en memoria (`tmpfs`):** cada corrida arranca vacía y no queda nada que limpiar; además es más rápido que el disco.
- **Aislado del entorno de desarrollo:** puertos propios (5441, 6391, 27041, 8334, 1026 y 8026) y un proyecto distinto (`fiaro-test`), así que puede correr mientras tu stack de desarrollo está arriba y `pnpm docker:test` no puede tocarlo (el script fija el proyecto con `-p`).
- **Qué corre:** el contenedor `test` espera a que la infraestructura esté sana y ejecuta `pnpm test:cov && pnpm test:e2e`. Hoy ninguna prueba usa las bases de datos (las unitarias y las e2e no las necesitan): el entorno queda listo, y verificado, para las pruebas de integración con Prisma, BullMQ o S3.
- **Para probar desde tu máquina contra esa infraestructura:** `docker compose -p fiaro-test -f compose.yaml -f compose.test.yaml up -d --wait` y usa los puertos de prueba.
- El CI corre lo mismo en el job `docker`.

### Observabilidad (perfil `observability`)

```
contenedores ── logs ──────────────────────────▶ Alloy ─▶ Loki ─────────────────┐
cAdvisor, Postgres, Redis, Mongo, Loki, Grafana ─ métricas ─▶ Alloy ─ remote write ─▶ Prometheus ─┤
                                                                                     Grafana ◀────┘
```

- **Alloy es el único recolector.** Prometheus solo guarda y consulta (recibe por *remote write* y se mide a sí mismo). Es la misma forma que tendrá producción: apuntar Alloy a Grafana Cloud u otro destino cambia una URL, no cómo se recolecta. Los exportadores de Postgres, Redis y Mongo van dentro de Alloy: tres contenedores menos.
- **Solo recoge el proyecto `fiaro`** (filtro por la etiqueta de Compose), no todo lo que corra en Docker. Los logs de la API llegan solos: es un contenedor del proyecto.
- **Raspa cada 15 segundos** y los dashboards usan `$__rate_interval`. Con el intervalo por defecto de Alloy (60 s) una tasa de un minuto casi nunca tiene dos muestras y los paneles de tasas salen vacíos.
- **Retención de 7 días** en Prometheus y Loki, para que el disco no crezca sin límite.
- **cAdvisor con Docker 29:** desde que Docker usa el almacén de imágenes de containerd, cAdvisor necesita el socket de containerd de Docker (`--containerd=/var/run/docker/containerd/containerd.sock`); sin él no registra el runtime y solo ve el cgroup raíz. Tampoco hay que fijar `--containerd-namespace=moby`: la fábrica de containerd reclamaría antes los contenedores y perderían el nombre y las etiquetas de Compose (los dashboards mostrarían IDs de 64 caracteres). Verificado en OrbStack; en otros runtimes puede cambiar la ruta del socket.
- **Permisos amplios, solo para desarrollo:** Alloy monta el socket de Docker (solo lectura) y cAdvisor corre `privileged`. Es lo mínimo para ver otros contenedores y equivale a dar control sobre Docker.
- **Dashboards** (aprovisionados desde `docker/grafana/dashboards`, de solo lectura en la interfaz): *Contenedores* (CPU, memoria, red y disco por servicio), *Bases de datos* (Postgres, Redis y Mongo) y *Logs* (volumen, errores y búsqueda por servicio). Para cambiarlos se edita el JSON.

### Almacenamiento S3

- **SeaweedFS, no MinIO.** El repositorio de MinIO se archivó el 25 de abril de 2026: desde octubre de 2025 no publicaba imágenes oficiales y desde diciembre estaba en «maintenance mode». RustFS solo publica versiones preliminares. SeaweedFS tiene licencia Apache-2.0, sigue mantenido y publica una versión por semana.
- **Verificado con el SDK de AWS v3** (el que usará la API): subida y lectura, URLs firmadas de lectura y de escritura (caducadas o con la firma alterada dan 403), subida multipart de 12 MB, listado, CORS del bucket y borrado.
- **Paridad con R2:** región `auto` y direccionamiento por ruta (`forcePathStyle`). Con el SDK de AWS v3 conviene `requestChecksumCalculation: 'WHEN_REQUIRED'` y `responseChecksumValidation: 'WHEN_REQUIRED'` (lo que Cloudflare recomienda para R2); SeaweedFS acepta tanto eso como el comportamiento por defecto del SDK.
- **Solo S3:** el modo `mini` activa además WebDAV, un catálogo Iceberg, Lance y una interfaz de administración; se apagan. El bucket `fiaro-dev` se crea al arrancar.

### Imágenes y secretos

- **Un `Dockerfile`, un target por entorno:** `dev` (recarga en caliente), `test` (hereda de `dev` y corre la suite) y `prod` (el último, así que `docker build .` produce la de producción).
- **Token de GitHub Packages como secreto de BuildKit:** `@fiaro-app/contracts` es privado. El token entra con `--secret id=NODE_AUTH_TOKEN`, existe solo durante el `RUN` que instala y no queda en ninguna capa ni en `docker history`; la imagen `prod` ni siquiera comparte capas con la etapa que lo usó. Si falta, el build se detiene con un mensaje claro en lugar de un 401 críptico.
- **`prod`:** Node 24 `-slim`, solo las dependencias de producción y `dist`, usuario `node` y código que no puede escribir. Se probó con `--read-only`, `--cap-drop ALL` y `no-new-privileges`. Sin `TRUST_PROXY` no arranca (sección 9). Su `HEALTHCHECK` abre una conexión TCP al puerto de la API.
- **Debian, no Alpine**, en las imágenes de Node y de Postgres. Postgres: Alpine usa musl, que no soporta locales, y el orden de las consultas (`en_US.utf8`) no coincidiría con el de Neon. Node: glibc evita sorpresas con módulos nativos (Prisma, sharp). Además, Postgres 18 guarda los datos en `/var/lib/postgresql` (ya no en `.../data`) y el volumen se monta ahí.
- **Versiones:** Prometheus está en su línea LTS (3.13, con soporte hasta julio de 2027); el resto, en la última versión estable con al menos una semana publicada.

### Lo que todavía no está

- **Métricas de la API** (`/metrics`) y **logs JSON con Pino**: los logs de stdout ya llegan a Loki; el raspado de `/metrics` se agrega a `docker/alloy/config.alloy` cuando exista.
- **`/health`:** el healthcheck de la API es por TCP; con el módulo `system` pasa a HTTP (también lo necesita Fly.io).
- **Cierre ordenado** (`enableShutdownHooks`): hoy no hay conexiones que cerrar; con Prisma y BullMQ sí.
- **`fly.toml`** y el despliegue.
- **Trazas** (OpenTelemetry y Tempo): con un solo servicio no hacen falta; Alloy puede recibir OTLP cuando lleguen.