# Arquitectura técnica — `api`

> Documento de referencia para quien escriba código en este repo (incluido tú mismo en 3 meses). Cubre **cómo** se construye el backend: estructura de carpetas, convenciones, reglas de dependencia y herramientas. Para el **qué** y el **por qué** de producto (dominio, entidades, multi-tenancy, roadmap), ver [PRODUCT.md](./PRODUCT.md).
>
> Estado: la estructura, las herramientas y las reglas de este documento están instaladas y verificadas. La persistencia con Prisma (§4) y la autenticación (§6) ya están construidas; el resto de la lógica de negocio se construye funcionalidad por funcionalidad y cada pieza nueva sigue lo que se describe aquí.

## 1. Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | NestJS 12 (TypeScript 6.0, `strict`) | TypeScript fijado en `~6.0.3`: es el más nuevo que soporta typescript-eslint |
| Runtime | Node 24 LTS, pnpm 11 | Versión en `.nvmrc` y `engines`; `packageManager` fijado en `package.json` |
| Contratos | `@fiaro-app/contracts` | Schemas de Zod, tipos y endpoints compartidos con las apps. Paquete privado en GitHub Packages: el acceso está en el README |
| Validación y docs de la API | Schemas de Zod (Standard Schema) + `@nestjs/swagger` | El pipe de validación y la documentación OpenAPI salen de los mismos schemas — ver secciones 5 y 11 |
| Seguridad HTTP | Helmet, CORS, `cookie-parser`, `@nestjs/throttler` | Se configura antes del primer endpoint — ver sección 11 |
| Autenticación | better-auth 1.7 con un adaptador propio | Celular y contraseña, sesiones de 30 días en PostgreSQL y plugin de Expo para las apps — ver sección 6 |
| ORM | Prisma 7 con `@prisma/adapter-pg` (sin motor en Rust) | Nunca se expone el tipo generado por Prisma fuera de `infrastructure` — ver sección 4 |
| Base de datos | PostgreSQL 18 (Neon en producción) | Migraciones versionadas con Prisma; el entorno local corre la misma versión — ver sección 12 |
| Cache / colas | Redis (Upstash) + BullMQ | |
| Auditoría | MongoDB Atlas | Solo eventos, nunca datos transaccionales del crédito |
| Lint | ESLint 10 + typescript-eslint (reglas con tipos) + eslint-plugin-boundaries | `pnpm lint` — ver secciones 3 y 8 |
| Formato | Prettier | `pnpm format`, `pnpm format:check` |
| Test | Vitest 5 con SWC: unitarias y e2e contra PostgreSQL real; cobertura v8 | `pnpm test`, `pnpm test:e2e` y `pnpm test:cov` (todo junto, mínimo 95 %) — ver sección 7 |
| Hooks de git | Husky + lint-staged + commitlint | Ver sección 8 |
| Docs | Compodoc | `pnpm docs` → `docs/` (no se commitea, se publica como artefacto de CI) |
| Análisis estático | SonarQube Cloud (CI-based) | Lee la cobertura de `pnpm test:cov`; deben pasar la quality gate de Sonar y el mínimo de 95 % de Vitest |
| Entorno local | Docker Compose (OrbStack o Docker Desktop) | Postgres, Redis, Mongo, S3, Mailpit y la API con recarga en caliente; observabilidad opcional — ver sección 12 |
| Despliegue | Fly.io (Docker) | El `Dockerfile` ya existe (target `prod`); `fly.toml` se agrega con el primer despliegue |

## 2. Estructura de carpetas

Un módulo por funcionalidad del dominio, cada uno con su propia arquitectura hexagonal (`domain`, `application`, `infrastructure`). Lo que usan todos los módulos vive en `shared`, con las mismas tres capas:

```
src/
  main.ts                        # Arranca la aplicación
  app.module.ts                  # Raíz de composición: registra los módulos, el rate limit y el guard de autenticación
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
      value-objects/             #   mobile-phone (ya existe); money, national-id, business-date
      errors/                    #   DomainError base: code, kind, params e issues
      audit/                     #   AuditEvent: qué se registra (acciones, resultado, celular enmascarado)
    application/
      ports/                     #   clock, id-generator, session-resolver (ya existen); email-sender
      security/                  #   Reglas de autorización: qué rol puede hacer qué sobre qué recurso
      audit/                     #   AuditLog: el puerto donde se registra la auditoría; nunca falla ni espera
      validation/                #   zodIssueParams: los valores de una falla de Zod que llenan los marcadores del texto (ya existe)
    infrastructure/
      persistence/               #   schema/ y migrations/ de Prisma, generated/ (no se commitea) y PrismaService
      runtime/                   #   Reloj del sistema y generador de UUIDv7
      http/                      #   Pipes, guard de autenticación, middlewares y opciones HTTP (SchemaValidationPipe, AuthGuard, cabeceras de seguridad, CORS, versionado)
      logging/                   #   Logs JSON con Pino: logger, log de cada petición, id de petición y adaptador del logger de Nest
      filters/                   #   Filtro global de excepciones y ApiErrorFactory: todo error sale como ApiError de contracts, con el mensaje del catálogo
      crypto/                    #   Hashing y cifrado
      notifications/             #   Email (Resend), WhatsApp (Twilio)
      messaging/                 #   Colas (BullMQ)
      store/                     #   Cache y almacenamiento clave-valor (Redis)
      audit/                     #   PinoAuditLog (una línea de log por evento) y PersonalDataMasker; la cola y MongoDB llegan después
      metrics/                   #   Métricas y observabilidad
      maintenance/               #   Modo mantenimiento (503 MAINTENANCE)
      swagger/                   #   Documentación OpenAPI
      i18n/                      #   Idioma de la petición (Accept-Language), TranslationService y mensajes por defecto de Zod
  config/                        # Lectura y validación de variables de entorno (env.ts, env.module.ts, env.token.ts)
  i18n/                          # Los textos de la API por idioma: es/errors.json y es/validation.json
test/
  auth/, i18n/, logging/, security/  # Pruebas e2e: una suite por flujo de negocio (auth), por función transversal (i18n, logging) o por protección (security)
  support/                       # Arranque de la app de pruebas, base de datos por corrida y utilidades
postman/                         # La carpeta que se conecta a Postman: .postman/resources.yaml (enlace al workspace FIARO) y postman/ con la colección «Fiaro API» (YAML v3) y el entorno local
scripts/                         # seed-dev-users.js: las personas de desarrollo
```

**Carpetas que se crean con su primer archivo.** Cada módulo nace con sus tres capas. Las subcarpetas del árbol (`entities`, `use-cases`, `controllers`...) aparecen cuando el módulo las necesita: no todos los módulos usan todas, y crearlas de antemano serían unas 170 carpetas vacías. Las carpetas vacías llevan un `.gitkeep` para que git las conserve; se borra al agregar el primer archivo.

**Nombres de archivo:** kebab-case con un sufijo que dice qué es: `.entity.ts`, `.value-object.ts`, `.enum.ts`, `.error.ts`, `.policy.ts`, `.repository.ts` (interfaz en `domain`), `.token.ts`, `.use-case.ts`, `.service.ts`, `.dto.ts`, `.port.ts`, `.event.ts`, `.controller.ts`, `.module.ts`, `.mapper.ts`, `.filter.ts`, `.guard.ts`, `.pipe.ts`, `.middleware.ts`, `.decorator.ts`, `.options.ts`, `.setup.ts`, `.schema.ts` (schema de Zod de la capa HTTP), `.docs.ts` (decoradores de Swagger), `.validator.ts`, `.constants.ts`, `.factory.ts` y `.providers.ts`. Los adaptadores llevan el nombre de la tecnología: `prisma-loan.repository.ts`, `resend-email-sender.ts`.

**Imports con alias, nunca relativos (D-52):** `@/` apunta a `src/` y `@test/` a `test/` (`paths` en `tsconfig.json`, una sola definición que leen TypeScript, Vitest, ESLint y el build de Nest): `import { DomainError } from '@/shared/domain/errors/domain-error.js'`, no `'../../../shared/…'`. ESLint prohíbe los imports que empiezan con `./` o `../` (`no-restricted-imports`). Por qué: mover un archivo no rompe sus imports ni los de quienes lo importan; la ruta dice de un vistazo a qué capa se llega (justo lo que revisa la regla de la sección 3); y una cadena de `../../../` no se lee. La extensión `.js` es obligatoria en ESM, y el compilador de Nest reescribe los alias en `dist/`.

**Archivos pequeños, con una sola razón para cambiar (D-52):** ESLint limita cada archivo a 200 líneas de código y cada función a 50, con complejidad ciclomática 10 y anidación 3 (`max-lines`, `max-lines-per-function`, `complexity`, `max-depth`; no cuentan líneas en blanco ni comentarios; las pruebas admiten 300 líneas por archivo). Lo que no tiene que vivir junto se separa en un archivo con nombre propio: constantes, schemas, reglas puras, tipos y la documentación de Swagger. Ejemplo: `modules/auth/infrastructure/better-auth/` reparte la instancia de better-auth en `auth.factory.ts` (la ensambla), `auth-options.ts`, `auth-plugins.ts` y `auth-hooks.ts` (la configuran) y `auth-hook-rules.ts` (las reglas de Fiaro, funciones puras que se prueban sin better-auth). Un límite en el lint funciona mejor que una recomendación: nadie tiene que acordarse de él.

**`dtos` y `contracts`:** los requests y respuestas HTTP vienen de `@fiaro-app/contracts`. Los `dtos` de `application` son la entrada y salida de cada caso de uso, independientes de HTTP: el controller traduce del contrato al DTO del caso de uso.

**`tokens`:** en TypeScript las interfaces desaparecen al compilar, así que NestJS no puede inyectar un `LoanRepository` por su tipo. Cada puerto o repositorio tiene un token (`Symbol`) con el que se registra y se inyecta la implementación.

**Comentarios (D-55):** TSDoc (`/** */`) en todo símbolo exportado (funciones, clases, constantes, interfaces y sus miembros): Compodoc los publica en `docs/` y el editor los muestra al pasar el cursor. `eslint-plugin-tsdoc` valida la sintaxis (`@param nombre - texto`, `@returns`, `@throws {@link Error}`), y `@remarks` explica el orden o el motivo cuando importan. Cada comentario dice qué hace y qué devuelve, sin repetir el nombre. Nada de comentarios `//` que narren el código ni que expliquen el porqué de una decisión: eso va en este documento y en PRODUCT.md. En las pruebas, el nombre del `it()` es la explicación.

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
| `i18n` | Sus propios textos | Solo `@fiaro-app/contracts`, cuyos textos por idioma suma a los suyos |
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

**Cómo está hoy:**

- **Esquema por áreas** en `src/shared/infrastructure/persistence/schema/`: `base.prisma` (generador y conexión) e `identity.prisma` (`users`, `sessions`, `accounts` y `verifications`). Prisma lee la carpeta entera, así que cada área nueva es un archivo nuevo y no un esquema único que crece sin límite. `prisma.config.ts`, en la raíz, dice dónde están el esquema y las migraciones.
- **Migraciones SQL versionadas** en `persistence/migrations/`: `pnpm db:migrate` crea una a partir del esquema (desarrollo) y `pnpm db:deploy` aplica las pendientes (el contenedor de desarrollo lo hace al arrancar, y las pruebas e2e en su base de datos). Una migración ya aplicada nunca se edita: se agrega otra.
- **Cliente generado** en `persistence/generated/`, que no se commitea: `pnpm db:generate`, que corre también al instalar (`prepare`) y en `pnpm build`. Usa `@prisma/adapter-pg` y `engineType = "client"`: las consultas las ejecuta el driver `pg` de Node, sin el motor en Rust; la imagen es más pequeña y no hay binarios por plataforma. `PrismaService` extiende `PrismaClient`, conecta con la primera consulta y se desconecta al cerrar la aplicación.
- **Nombres:** tablas y columnas en `snake_case` con `@map`; el código las ve en camelCase. Los identificadores son `uuid` que genera la aplicación (UUIDv7, D-32), incluso los de las filas de better-auth, y las fechas `timestamptz(3)`.
- **Reglas también en la base de datos:** `users.phone` es único y un `CHECK` exige el formato de celular colombiano en E.164 (D-27). Prisma no expresa los `CHECK` en el esquema, así que están escritos a mano en la migración. Si un error de la aplicación dejara pasar un celular inválido, la base lo rechaza.

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
- **Errores:** filtro de excepción global (`shared/infrastructure/filters`) que responde `ApiErrorSchema`: `{ statusCode, code, message, path, timestamp, issues }`. `code` es un string estable que las apps usan en lugar de parsear `message`: los generales están en `ErrorCodeSchema` (`VALIDATION_FAILED`, `SUBSCRIPTION_READ_ONLY`...) y cada módulo agrega los suyos (`LOAN_NOT_FOUND`). `issues` trae el detalle por campo cuando el código es `VALIDATION_FAILED`; en los demás casos es `null`. Los errores de dominio (`DomainError` y sus subclases) se traducen a su código HTTP en ese filtro. Todo error sale de ese filtro (`ApiExceptionFilter`) o, si lo escribe better-auth, de la misma fábrica (`ApiErrorFactory`): todos tienen la misma forma. El código que falla solo dice el `code` (`new UnauthorizedException({ code: 'UNAUTHENTICATED' })`) y el mensaje sale del catálogo de idiomas (ver «Idiomas y textos»): nadie escribe texto de error a mano. Una excepción sin `code` lo recibe de su estado (404 → `NOT_FOUND`, 429 → `RATE_LIMITED`...); un error de `body-parser` (JSON mal formado, cuerpo demasiado grande) conserva su estado (400 `BAD_REQUEST`, 413 `PAYLOAD_TOO_LARGE`); y cualquier otra cosa que se lance es un 500 `INTERNAL_ERROR` cuyo mensaje nunca sale en la respuesta: se escribe en el log con su traza y el `requestId`. `path` es la ruta pedida sin cadena de consulta. Los errores de dominio (`DomainError`, en `shared/domain/errors`) también salen por aquí (D-60): cada uno declara su `code`, su categoría (`kind`: `INVALID` → 400, `NOT_FOUND` → 404, `CONFLICT` → 409, `FORBIDDEN` → 403, `RULE_VIOLATED` → 422; el dominio no conoce HTTP, y una categoría nueva sin estado no compila), los `params` que llenan su texto (`INVALID_PASSWORD_LENGTH`: `{minLength}` y `{maxLength}`) y, si valida varios datos a la vez, los `issues` por campo. Su `message` es para el log y nunca sale: el texto de la respuesta sale de `errors.<code>`, y una prueba falla si el código de un error de dominio no tiene texto. El de la contraseña de longitud inválida es `INVALID_PASSWORD_LENGTH` y no `INVALID_PASSWORD`, que es el de better-auth para una contraseña incorrecta: una app que reacciona al código no puede confundir los dos. Ninguna ruta los lanza todavía (el alta de personas es un caso de uso sin ruta, D-51); `test/auth/domain-errors.e2e-spec.ts` llama al caso de uso desde una ruta de prueba y comprueba cada error de punta a punta.
- **Idiomas y textos (D-59).** Ningún texto de una respuesta está en el código: viven en catálogos por idioma en `src/i18n/<idioma>/` (`errors.json`: un texto por `code`; `validation.json`: un texto por tipo de falla de Zod), hoy solo `es`. La API elige el idioma con `Accept-Language` (`createLanguageMiddleware`, RFC 9110: pesos `q`, regiones —`es-CO` sirve `es`— y `*`) y, si piden uno que no habla o no piden ninguno, responde el de por defecto (`DEFAULT_LANGUAGE`). El idioma viaja con la petición en un `AsyncLocalStorage`, como el `requestId`, así que `TranslationService.translate(clave, params)` no necesita que nadie se lo pase; un texto que falta en un idioma sale en el de por defecto, nunca como una clave. Las respuestas de error dicen en qué idioma salieron (`Content-Language`) y que cambian según `Accept-Language` (`Vary`); las demás no, porque no llevan texto para personas. Quién escribe qué:
  - **Guards, pipe y rate limit** solo lanzan el `code`; el filtro lo traduce.
  - **better-auth** escribe sus errores en inglés: se traducen por su `code`. `errors.json` trae los 49 códigos de la librería y los 12 del plugin de celular, y una prueba falla si al actualizarla aparece uno sin texto.
  - **Zod:** `configureZodMessages()` (la llama `configureApp`) hace que sus mensajes por defecto sean claves (`validation.too_small.string`) y el pipe pasa los valores de la falla (`minimum`, `keys`...) para llenar los marcadores `{minimum}` del texto. Los schemas de `contracts` no escriben texto sino claves (`contracts.phone.invalid_mobile`) y el paquete trae los textos por idioma (`CONTRACT_MESSAGES`, desde la 0.2.0): `MESSAGES` los suma a los de la API (grupo `contracts`) y se traducen como los demás. Un mensaje que un schema escriba a mano, con su texto, tiene prioridad y sale tal cual. La configuración de Zod es global del proceso, no de una petición: por eso el texto se decide al responder, no al validar.
  - **La forma de los catálogos** la fija `es`: `MESSAGES` (`src/i18n/index.ts`) exige que cada idioma tenga las mismas claves (si falta una, no compila) y una prueba comprueba que también coinciden los marcadores `{...}`.

  **Agregar un idioma:** crear `src/i18n/<idioma>/errors.json` y `validation.json` con las mismas claves y una línea en `MESSAGES` (`en: { errors, validation, ...CONTRACT_MESSAGES.en }`); el idioma tiene que existir antes en `@fiaro-app/contracts`, que es quien escribe los textos de sus mensajes. No hay que tocar nada más: ningún guard, pipe ni ruta tiene texto propio, y `test/i18n/` prueba con un segundo idioma de mentira que la aplicación ensamblada responde en el que pide la cabecera.
- **Validación:** con los schemas de Zod de `contracts`, no con DTOs de class-validator: el contrato es la única fuente de verdad. Cada parámetro declara su schema (`@Body({ schema: CreateLoanSchema })`, `@Param({ data: 'id', schema })`) y el pipe global `SchemaValidationPipe` (`shared/infrastructure/http`) lo valida. Está construido sobre el `StandardSchemaValidationPipe` de NestJS 12, así que no hace falta una librería de terceros (`nestjs-zod` no soporta Nest 12). Los bodies son `z.strictObject`, así que un campo desconocido responde `400 VALIDATION_FAILED` en lugar de ignorarse. Un `@Body()` o `@Query()` **sin schema** es un error de programación y responde 500: el pipe de Nest lo dejaría pasar sin validar en silencio, y un olvido así abriría la puerta a datos sin revisar. Ver sección 11.
- **Versionado y compatibilidad con apps viejas:** las rutas **no llevan prefijo de versión** (`/clients/:id`, igual que en `contracts`): la versión se elige con la cabecera `API-Version` y, si falta, se sirve la versión `1`, que es la que usan las apps ya instaladas. Los cambios aditivos (un campo o una ruta nueva) no cambian la versión: los schemas de respuesta de `contracts` ignoran campos desconocidos. Un cambio incompatible crea la versión 2 **junto a** la 1: las apps nuevas envían `API-Version: 2` y las instaladas siguen igual, sin cabecera. La versión 1 se retira cuando el version-gate (`GET /mobile/version`) ya bloquea a las apps por debajo de `minimumSupportedVersion` que la usan. Las rutas de infraestructura (`/health`, `/mobile/version`) son `VERSION_NEUTRAL`: responden con cualquier versión y siguen alcanzables aunque una se retire. Una versión que la ruta no tiene responde 404. Ver sección 11 (D-41).

## 6. Autenticación y autorización

**Autenticación: better-auth con un adaptador propio (D-48).** Vive en `modules/auth`. El dominio y los casos de uso no conocen better-auth: solo los puertos `PasswordHasher` y `SessionResolver`, que implementan sus adaptadores. Un adaptador propio deja cuatro rutas publicadas y bajo nuestro control (validación con Zod, versionado, Swagger, rate limit y guard global de la API) en lugar de montar todas las de better-auth.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Rutas | `auth.controller.ts` | Reenvía cuatro rutas de better-auth, tal como son: `POST /auth/sign-in/phone-number` (`{ phoneNumber, password }`), `GET /auth/get-session`, `POST /auth/sign-out` y `POST /auth/change-password` (`{ currentPassword, newPassword }`). El body se valida antes con el schema de cada ruta. Cualquier otra ruta de better-auth (registro, correo, cuentas sociales, código por SMS) responde 404 |
| Traducción | `auth-request.ts`, `auth-response.ts` | Convierten la petición de Express en la `Request` que espera `auth.handler` y escriben su respuesta (estado, cuerpo y cada cookie) en la de Express |
| Instancia | `auth.factory.ts`, `auth-options.ts`, `auth-plugins.ts` | Celular y contraseña (plugin `phoneNumber`), plugin de Expo, sesiones en PostgreSQL con Prisma, ids UUIDv7 y rate limit |
| Reglas de Fiaro | `auth-hooks.ts`, `auth-hook-rules.ts` | Igualan el tiempo de respuesta de un celular sin cuenta; al cambiar la contraseña revocan las demás sesiones y quitan `mustChangePassword` |
| Guard global | `shared/infrastructure/http/auth.guard.ts` | Toda ruta exige sesión salvo las marcadas con `@Public()`; `@CurrentUser()` entrega la persona a los controllers |
| Alta de personas | `CreateUserUseCase` | No hay registro público: las personas se crean con este caso de uso (el seed de desarrollo y, más adelante, el registro del Owner y el alta de cobradores) |

Lo que conviene saber, y por qué:

- **Login por celular, email técnico (D-49).** better-auth exige un email único por usuario. `loginEmail` es una dirección técnica derivada del celular (`technical-email.ts`), no una credencial: `emailAndPassword` está apagado, así que ninguna ruta acepta email y contraseña. El correo real, opcional, vive aparte en `contactEmail` (D-07).
- **Sesión de 30 días que se renueva con el uso (D-50).** Cookie `fiaro.session_token` (`HttpOnly`, `SameSite=Lax`, `Secure` con HTTPS). Cada día de uso la renueva otros 30 días; sin uso, vence. Las sesiones están en la base de datos y no hay caché de sesión en la cookie: revocar una (borrar su fila) surte efecto en la siguiente petición, no cuando venza una caché. El guard no la renueva (`disableRefresh`): la renovación ocurre en `GET /auth/get-session`, que sí responde con `Set-Cookie`. Si el guard alargara la sesión en la base de datos sin que la app reciba la cookie nueva, la app la daría por vencida a los 30 días aunque el servidor la siguiera aceptando.
- **El token de sesión solo viaja en la cookie (D-57).** Iniciar sesión, ver la sesión y cambiar la contraseña no lo devuelven en el cuerpo: `writeAuthResponse` lo quita de `token` y de `session.token` antes de responder (`auth-response-body.ts`). La cookie es `HttpOnly` y el JavaScript de una página no la lee; en el cuerpo sí lo leería un script inyectado (XSS) que llamara a `GET /auth/get-session`, y la protección de la cookie no serviría de nada. Los clientes no lo necesitan: el navegador manda la cookie solo y el plugin de Expo guarda la que llega en `Set-Cookie`. Por dentro la API sí lo ve (el guard resuelve la sesión con better-auth): solo se recorta lo que sale por HTTP. La cookie de sesión no pasa por `cookie-parser` (el proyecto lo usa para llenar `req.cookies` con cookies propias, D-40): better-auth la lee y la escribe directamente en las cabeceras.
- **Apps móviles.** Usan el cliente oficial de better-auth con su plugin de Expo, que guarda la cookie cifrada en el dispositivo (SecureStore) y envía `expo-origin`; la API lo acepta si su esquema está en `MOBILE_APP_SCHEMES`. Por eso las rutas se publican «tal cual» y no hay un contrato propio para iniciar sesión.
- **Origen y CSRF siempre activos.** Una petición con cookie debe traer un `Origin` de confianza (el de la API, uno de `CORS_ORIGINS` o un esquema móvil) o responde 403 `INVALID_ORIGIN`. better-auth apaga esa comprobación con `NODE_ENV=test`; aquí se fuerza encendida para que las pruebas ejerzan lo mismo que producción.
- **Contraseña temporal (D-34).** Con `mustChangePassword` la sesión existe pero solo sirve para ver la sesión, cambiar la contraseña y cerrar sesión; el resto responde 403 `PASSWORD_CHANGE_REQUIRED`. Cambiarla revoca siempre las demás sesiones (quien conociera la temporal, por ejemplo por WhatsApp, pierde el acceso) y quita la marca.
- **No se puede averiguar qué celulares tienen cuenta.** Un celular sin cuenta y una contraseña incorrecta responden lo mismo (401 `INVALID_PHONE_NUMBER_OR_PASSWORD`) y tardan lo mismo: con un celular desconocido better-auth respondería al instante, así que un hook calcula un hash de la misma dificultad para nivelar el tiempo.
- **Rate limit:** 5 intentos por minuto y por IP al iniciar sesión y al cambiar la contraseña (el de better-auth, en memoria); el general de la API sigue aplicando. Detalle y límites en la sección 11.
- **Celular sin verificar (D-51).** Las rutas de código por SMS están apagadas (`DISABLED_PATHS`, y `sendOTP` falla si alguien las enciende): en el MVP quien escribe el celular responde por él. Riesgo que se asume por ahora: alguien podría dar de alta el celular de otra persona. Al agregar el registro público hay que verificarlo (código por WhatsApp o SMS) antes de crear la cuenta.
- **Errores y caché.** Los errores llevan un `code` estable y, al pasarse del límite, `Retry-After`; toda respuesta de autenticación lleva `Cache-Control: no-store`, porque trae la cookie de sesión y datos personales.
- **Auditoría de la autenticación (D-61).** Los hooks de better-auth (`auth-hooks.ts`, `auth-database-hooks.ts`) registran cinco eventos: `auth.sign_in.succeeded`, `auth.sign_in.failed`, `auth.sign_out`, `auth.password.changed` y `auth.password.change_failed`. Cada uno lleva quién (`userId`, si se sabe), el celular enmascarado, desde dónde (IP y navegador), el `requestId` de la petición, el resultado y, si fue rechazado, el código del motivo; `AuthAuditor` arma el evento y lo entrega al puerto `AuditLog` (`shared/application/audit`). Por qué desde los hooks: un inicio de sesión fallido no escribe nada en la base de datos, así que solo un hook lo ve; y cerrar sesión se audita en el borrado de la fila de la sesión porque esa ruta no sabe quién era (las sesiones que revoca un cambio de contraseña o que vencen no cuentan como cerrar sesión). **Datos personales:** el celular se guarda enmascarado (`PersonalDataMasker`: últimos 4 dígitos y una huella HMAC-SHA256 de 128 bits con una clave derivada del secreto con HKDF; un hash simple de un celular colombiano se revertiría probando sus mil millones de posibilidades) y nunca se registra una contraseña, una cookie ni un token; las pruebas e2e comprueban que no salen. **Registrar nunca falla ni espera** (`AuditLog.record` devuelve `void`): un log caído no rechaza un inicio de sesión. El primer adaptador (`PinoAuditLog`, en `shared/infrastructure/audit`) escribe cada evento como una línea JSON con `audit: true` (`{service="api"} | json | audit="true"` en Loki); un `LOG_LEVEL` por encima de `info` la silencia. La cola de BullMQ y Mongo se suman después como otro adaptador del mismo puerto, sin tocar los hooks. Los logs de la propia better-auth salen ahora por el logger de Nest (`auth-logger.ts`): JSON con el `requestId`, no una línea de texto suelta.

**Autorización:**

- **Roles por membership**: `User` ↔ `Lender` con un conjunto de roles (`OWNER`, `LENDER`, `COLLECTOR`); los guards evalúan el conjunto, no un rol único (D-02).
- **Reglas de autorización** en `shared/application/security`: funciones puras (qué rol puede hacer qué sobre qué recurso), usadas por los guards y por los casos de uso.
- `LenderScopeGuard` (en `shared/infrastructure/http`): toma `lenderId` de la membership activa de la sesión, nunca del body/query. En modo cobrador valida además que el préstamo tenga una `CollectionAssignment` vigente para esa membership.
- `SubscriptionGuard`: bloquea `POST`, `PATCH` y `DELETE` cuando la suscripción del Tenant está en solo lectura; las lecturas (`GET` y `QUERY`) siguen funcionando y la respuesta de error usa el código `SUBSCRIPTION_READ_ONLY`. Gracia de 7 días; después solo lectura **excepto** registrar visitas/pagos (D-21).
- Row Level Security de Postgres como segunda capa — se define junto con el esquema de Prisma, no reemplaza al guard de aplicación.

## 7. Testing

Dos proyectos de Vitest en un solo `vitest.config.ts`, con la misma compilación (SWC) y los mismos alias (`@/`, `@test/`):

| Proyecto | Archivos | Necesita | Comando |
|---|---|---|---|
| `unit` | `src/**/*.spec.ts`, junto al archivo que prueban | Nada: corren en milisegundos | `pnpm test` |
| `e2e` | `test/**/*.e2e-spec.ts` | PostgreSQL (`pnpm docker:infra`) | `pnpm test:e2e` |
| Los dos, con cobertura | | PostgreSQL | `pnpm test:cov` |

- **Unitarios:** `loan.entity.spec.ts` junto a `loan.entity.ts`. Importan `describe`, `it` y `expect` desde `vitest`: no hay variables globales de prueba en el código de producción.
- **Dominio primero:** la lógica de `domain` y `application` se prueba sin `TestingModule` de Nest ni base de datos, con implementaciones en memoria de los puertos. Son las pruebas que más abundan y deben correr en milisegundos: es lo que mantiene la suite rápida cuando el proyecto crece. Los hooks de better-auth también se prueban aquí: son middlewares que se invocan con un contexto a medida.
- **E2E contra PostgreSQL real, sin mocks de la base de datos (D-53):** `Test.createTestingModule` de Nest, `supertest` y la aplicación ensamblada (`AppModule` + `configureApp`, como `main.ts`). Un mock de Prisma prueba el mock; lo que puede romperse son las migraciones, las restricciones y las transacciones, y solo una base de datos real las ejerce. `test/support/global-setup.ts` crea **una base de datos por corrida** en el servidor de `DATABASE_URL` (por defecto, el de `pnpm docker:infra`), le aplica las migraciones y la borra al terminar: las pruebas nunca tocan tus datos de desarrollo aunque compartan servidor. Cada prueba parte de tablas vacías y de una aplicación nueva.
- **Qué hay:** una suite por flujo de negocio (`test/auth/`: iniciar sesión, sesión, contraseña, guard, origen, rate limit, alta de personas, rutas apagadas, contrato con los schemas y documentación OpenAPI) una por función transversal (`test/i18n/`: los mensajes de error en cada idioma; `test/logging/`: los logs) y una por protección de la sección 11 (`test/security/`). Las de protección prueban la aplicación ensamblada con rutas de prueba, porque cada protección puede estar bien por separado y aun así no estar conectada. Se verificó que cada una falla al quitar su protección.
- **Suites en serie:** todas comparten la base de datos de la corrida (`fileParallelism: false`), y el rate limit de better-auth vive en la memoria del proceso. Por eso cada prueba se identifica con su propia IP en `X-Forwarded-For` (con `TRUST_PROXY=1`): así no gasta el límite de las demás.
- **SWC:** las pruebas se compilan con SWC (`unplugin-swc`), la configuración que recomienda NestJS para Vitest. Emite la metadata de decoradores que necesita la inyección de dependencias, y la cobertura de Vitest reconoce ese código generado y no lo cuenta como ramas sin probar.
- **Cobertura, mínimo 95 % (D-54):** `pnpm test:cov` corre las dos suites juntas y mide la cobertura de ambas, así que lo que solo ejercen las e2e (módulos, providers, la factory de better-auth, `PrismaService`) también cuenta. Exige 95 % de líneas, funciones, ramas y sentencias **en total y en cada archivo** (`perFile`): un promedio alto no puede esconder un archivo sin probar. Quedan fuera solo las pruebas, `main.ts` (únicamente hace `listen`; el smoke test del CI arranca la imagen de producción) y el cliente que genera Prisma. La lista está también en `sonar-project.properties` y deben coincidir; el `lcov` que lee SonarCloud sale de esta misma corrida. El porcentaje mide qué código se ejecutó, no si se probó bien: una prueba sin `expect` no vale (regla S2699 de Sonar) y las protecciones se verifican quitándolas para ver que la prueba falle.
- **En contenedores:** `pnpm docker:test` corre `pnpm test:cov` dentro de Docker, con la infraestructura efímera de `compose.test.yaml` — ver sección 12.

## 8. Herramientas, hooks y caché

**Hooks de git** (Husky), para que los problemas aparezcan antes del CI:

| Hook | Qué hace |
|---|---|
| `pre-commit` | lint-staged: ESLint con `--fix`, Prettier y `vitest related` (proyecto `unit`) **solo sobre los archivos en staging**. El tiempo del commit depende del cambio, no del tamaño del proyecto |
| `commit-msg` | commitlint: el mensaje debe seguir Conventional Commits (`feat:`, `fix:`, `docs:`...) |
| `pre-push` | Typecheck incremental y solo las pruebas unitarias afectadas por los cambios de la rama frente a `dev` (`vitest --project unit --changed`). El CI corre todo |

Los hooks no corren las e2e: necesitan PostgreSQL y un commit no debe depender de que Docker esté levantado. Las corre el CI, y tú con `pnpm test:e2e`.

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
**Peers opcionales:** `.pnpmfile.cjs` quita los peers opcionales que `@prisma/client`, `@better-auth/prisma-adapter` y `better-auth` declaran hacia herramientas que solo usamos en desarrollo (`prisma`, `typescript`, `vitest`, `react`, `react-dom` y `mysql2`), para que la imagen de producción no las instale. El motivo, la comprobación y por qué cambiar el archivo obliga a regenerar el lockfile están en la sección 12 («Imágenes y secretos»).


Cada una se agrega junto con la pieza que la usa, validada en `src/config/env.ts` al arrancar (si alguna es inválida el proceso no arranca y el error dice cuál), y se documenta en `.env.example` (nunca `.env` real, ver `.gitignore`) y aquí. En desarrollo se leen de un `.env` local, que Node carga sin dependencias (`process.loadEnvFile`, en `main.ts`); en producción las inyecta la plataforma y no hay archivo.

**Conectadas** (seguridad HTTP, sección 11; base de datos y autenticación, secciones 4 y 6):

| Variable | Por defecto | Para qué |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` o `production` |
| `PORT` | `3000` | Puerto HTTP |
| `CORS_ORIGINS` | vacío | Orígenes (separados por coma, sin barra final) que pueden llamar a la API desde un navegador. Vacío: ninguno |
| `TRUST_PROXY` | `0`; **obligatoria en producción** | Proxies de confianza delante de la API (`1` en Fly.io; `.env.example` la deja en `1`). De ahí sale la IP que cuenta el rate limit |
| `THROTTLE_TTL_MS` | `60000` | Ventana del rate limit, en milisegundos |
| `THROTTLE_LIMIT` | `100` | Peticiones permitidas por IP y por ruta dentro de la ventana |
| `SWAGGER_ENABLED` | activa salvo en producción | Publica la documentación en `/docs` |
| `LOG_LEVEL` | `info` (`silent` con `NODE_ENV=test`) | Nivel mínimo de los logs: `fatal`, `error`, `warn`, `info`, `debug`, `trace` o `silent` |
| `DATABASE_URL` | **obligatoria** | URL de PostgreSQL (`postgresql://usuario:clave@host:puerto/base`). En el entorno local con Docker la define Compose |
| `BETTER_AUTH_SECRET` | **obligatoria** | Firma las cookies de sesión; mínimo 32 caracteres (`openssl rand -base64 32`). En producción va en los secretos de la plataforma, nunca en el repo |
| `BETTER_AUTH_URL` | **obligatoria** | Origen público de la API (esquema, host y puerto, sin ruta). Con él better-auth arma sus URLs y reconoce su propio origen: nunca se toma de la cabecera `Host`, que el cliente controla |
| `MOBILE_APP_SCHEMES` | vacío | Esquemas de enlace profundo de las apps nativas (el `scheme` de su `app.json`), separados por coma. Con `fiaro` la API acepta `expo-origin: fiaro://`. Sin ellos, la app móvil recibe 403 en las peticiones con sesión |

**Pendientes** (cada una se agrega con su pieza):

| Variable | Para qué | Se agrega con |
|---|---|---|
| `REDIS_URL` | Cache + broker de BullMQ (Upstash) | Colas y caché |
| `MONGODB_URI` | Auditoría | Auditoría |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Storage de archivos por API S3: Cloudflare R2 en producción, SeaweedFS en local. Nombres sin el del proveedor: el mismo código sirve para los dos | Logo del prestamista |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Correo saliente (Mailpit en local) | Recuperación de acceso y reportes |
| `SENTRY_DSN` | Errores en producción | Primer despliegue |

En el entorno local con Docker (sección 12) Compose define `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y `MOBILE_APP_SCHEMES` con valores de desarrollo, y la API recibe además `REDIS_URL`, `MONGODB_URI`, `S3_*` y `SMTP_*` apuntando a los servicios de Compose; estas últimas se declaran en `src/config/env.ts` cuando el primer módulo las use.

## 10. Ramas y CI

Ver el `README.md` de este repo para el flujo de ramas (`dev`/`main`) y el pipeline de CI. Este documento cubre solo arquitectura de código.

El job `check` levanta un PostgreSQL como servicio y corre `pnpm test:cov`: unitarias y e2e en una sola corrida, que falla si la cobertura baja de 95 % y deja el `lcov` que lee SonarCloud. Además, el CI tiene un job `docker` que corre en paralelo: valida los archivos de Compose, construye la imagen de producción con el secreto de BuildKit, comprueba que arranca y queda sana, y corre la suite en contenedores (sección 12). Así un `Dockerfile` roto se detecta en el PR y no en el primer despliegue.

## 11. Seguridad HTTP

Todo esto se configura antes del primer endpoint, para que cada ruta nueva lo herede sin que nadie tenga que acordarse (D-40 a D-43). Vive en `src/app.setup.ts` (`configureApp`, que llaman `main.ts` y las pruebas e2e) y el rate limit en `AppModule`. Las piezas están en `shared/infrastructure/{http,swagger}` y la configuración en `config/`.

| Protección | Qué hace | Por qué |
|---|---|---|
| Helmet | Cabeceras de seguridad y política de contenido (CSP) | Reduce lo que un navegador puede hacer con una respuesta de la API |
| CORS | Solo los orígenes de `CORS_ORIGINS` pueden llamar desde un navegador | Evita que una página ajena use la sesión del usuario para leer sus datos |
| `cookie-parser` | Llena `req.cookies` | Lectura de cookies propias; la sesión la maneja better-auth (sección 6) |
| Rate limit | 100 peticiones por minuto por IP y ruta (5 al iniciar sesión y al cambiar la contraseña); 429 al pasarse | Frena la fuerza bruta y el abuso |
| Versionado | Cabecera `API-Version` (sin ella, la versión 1) | Permite cambiar la API sin romper las apps instaladas ni las rutas de `contracts` |
| Validación | Schema de Zod en cada body y parámetro | Nada llega a un caso de uso sin validar |
| Swagger | Documentación en `/docs`, apagada en producción | Documentación viva, sin publicar el mapa de la API donde no hace falta |

### Orden de `configureApp`

El orden es parte del diseño: `trust proxy` → logs → idioma (y mensajes de Zod) → Helmet → `cookie-parser` → CORS → versionado (con `Vary`) → pipe global → Swagger. Los logs van primero para que también queden registradas las peticiones que otro middleware responde por su cuenta (un preflight de CORS). El idioma va justo después, para que cualquier error posterior —también los de otro middleware, como un JSON mal formado— salga traducido. Helmet va antes que los demás para que las cabeceras salgan también en los errores, los 404 y las respuestas de preflight. El rate limit no es un middleware sino un guard global, que corre después de todos ellos: un preflight de CORS se responde antes de llegar a las rutas y nunca gasta el límite.

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
- **Rutas sensibles:** iniciar sesión y cambiar la contraseña admiten 5 intentos por minuto y por IP. Ese límite lo aplica el rate limit de better-auth, no el de Nest, con la misma IP que resuelve Express según `TRUST_PROXY`: el controller se la pasa en una cabecera interna y descarta la que envíe el cliente, así que no se puede falsificar. Los cobradores que salen por una misma IP (una oficina, un operador móvil) comparten ese límite; si estorba, la clave pasa a ser celular + IP. `/health` llevará `@SkipThrottle()`. Las apps móviles sincronizan de golpe lo registrado sin señal (D-05): deben respetar `Retry-After` en lugar de reintentar de inmediato.
- **Almacén en memoria** (el de Nest y el de better-auth): vale mientras haya una sola instancia. Con dos o más, cada una cuenta por su lado y el límite real se multiplica. Al escalar hay que compartirlo (Redis/Upstash) con un `ThrottlerStorage`: `@nest-lab/throttler-storage-redis` 1.2.0 declara soporte solo hasta NestJS 11 (verificado el 2026-09-23), así que hay que revisar su compatibilidad con Nest 12 o implementar la interfaz sobre el cliente de Redis del proyecto.

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
- De cada error solo salen `path` y `message` en `issues`, ya traducido: los schemas agregan más datos (límites, valores recibidos) que no deben salir; los límites solo se usan para llenar los marcadores del mensaje («La longitud mínima es 3.»).

### Documentación (Swagger)

- Publica `/docs` (interfaz) y `/docs/openapi.json` (documento), generados a partir de las rutas y del schema de cada `@Body({ schema })`: no hay nada que mantener a mano.
- **Apagada en producción por defecto** (`SWAGGER_ENABLED`). Describe cada ruta, campo y regla de una API financiera: es información que un atacante aprovecha y que nadie necesita en producción.
- **Todas las respuestas posibles (D-55).** La documentación de la autenticación son decoradores compuestos (`modules/auth/infrastructure/controllers/docs/`): cada ruta declara su cuerpo, la cookie (`addCookieAuth`) y cada respuesta, éxito y errores con su `code`, con el schema de Zod correspondiente (`standardSchema`). Las pruebas de contrato validan las respuestas reales con esos mismos schemas, y otra prueba comprueba que el documento describe exactamente las cuatro rutas publicadas: la documentación no puede quedar distinta de lo que la API responde.
- **Postman en el formato de Git nativo (D-56).** El repo guarda lo que Postman guarda: `postman/postman/collections/Fiaro API/` (Collection v3: una carpeta por carpeta de la colección y un archivo `.request.yaml` por solicitud, con sus pruebas automáticas, su descripción y los ejemplos de respuesta, todos los errores posibles incluidos) y `postman/postman/environments/Fiaro local.environment.yaml`. `postman/.postman/resources.yaml` enlaza la carpeta con el workspace **FIARO** y, después del primer push, con los ids de la nube. Un archivo por solicitud se revisa en un PR como cualquier código, y la app de Postman, su CLI y el repo trabajan sobre los mismos archivos: nadie exporta ni importa a mano.
- **Cómo se usa, y por qué `postman/postman/`.** En la app se conecta a FIARO la carpeta `postman/`, y Postman crea dentro otra `postman/` donde lee y escribe colecciones y entornos: de ahí la ruta doble. Solo lo que está en esa carpeta interna aparece en la vista local; un archivo suelto en `postman/` no se ve. El `.git` está un nivel más arriba y la app no lo encuentra desde esa carpeta, así que su integración con Git no aplica: los cambios se commitean con git como el resto del código. Si más adelante se quiere esa integración, se conecta la raíz del repositorio y `postman/` y `.postman/` suben un nivel. Desde la terminal se corre con el CLI oficial, sin iniciar sesión: `pnpm dlx postman-cli collection run "postman/postman/collections/Fiaro API" -e "postman/postman/environments/Fiaro local.environment.yaml" --no-report-events` (newman no lee el formato v3). `postman collection lint` valida la colección y `postman workspace lint`, corrido desde `postman/`, todo el workspace. Prettier no los formatea (`.prettierignore`): los reescribe Postman.
- **Errores con la forma de `ApiError`.** Los schemas de error de la documentación (`AuthError`, `ValidationError`, `RateLimited`) extienden `ApiErrorSchema` de `contracts` (`statusCode`, `code`, `message`, `path`, `timestamp`, `issues`), y la descripción del documento explica `Accept-Language` y los idiomas disponibles.
- **OpenAPI 3.2.** La 3.0 que Nest usa por defecto no define la operación `query`, y Swagger UI oculta las rutas `QUERY` (D-26), que serán casi todas las lecturas.

### Logs (D-58)

- **JSON en la salida estándar**, con Pino: una línea por registro, con `level` como texto, `time` en ISO 8601, `service` y, dentro de una petición, su `requestId`. `docker compose logs -f api` los muestra tal cual (`| pnpm dlx pino-pretty` los hace legibles) y con `pnpm docker:dev:obs` Alloy los manda a Loki, donde se filtran por campo: `{service="api"} | json | res_statusCode >= 400`.
- **Una línea por petición terminada** (`request completed`). La escribe `createHttpLogger`, el primer middleware, así que también quedan las que otro middleware responde por su cuenta (un preflight) y las que rechaza el rate limit: `req.method`, `req.path` (sin cadena de consulta), `route` (la plantilla, `/loans/:id`), `res.statusCode`, `responseTime`, `req.id`, la IP, el navegador y, si trae sesión, `userId`. El nivel sale del estado: los 5xx son `error`, los 4xx `warn` y el resto `info`.
- **`X-Request-Id`.** Se acepta el que envía el cliente si es corto y solo de letras, números, punto, guion y guion bajo; si no, se crea un UUID. Vuelve en la cabecera de la respuesta y en cada línea escrita mientras se atiende la petición (`requestId`, con `AsyncLocalStorage`): quien reporta un error dice cuál fue su petición y se encuentran todos sus logs, también los de Nest y los de una excepción.
- **Qué nunca se escribe.** Solo se eligen campos concretos de la petición y de la respuesta (`serializeRequest`, `serializeResponse`): nunca cabeceras (llevan la cookie de sesión y `Set-Cookie`), cuerpos ni cadena de consulta. Como segunda barrera, Pino reemplaza por `[redacted]` cualquier `cookie`, `authorization`, `password`, `currentPassword`, `newPassword`, `token` o `secret` que alguien agregue por descuido. Las pruebas e2e comprueban que una contraseña, una cookie y un token no salen.
- **Logger de Nest.** `PinoNestLogger` reemplaza al de Nest (`app.useLogger`) y `bufferLogs` en `main.ts` guarda lo que Nest escribe al arrancar hasta que exista: el arranque, las rutas registradas y las excepciones salen en el mismo JSON. Un 5xx sin excepción no escribe el `err` que inventaría pino-http («failed with status code 500», con una traza de la librería): la excepción real la escribe Nest en otra línea con el mismo `requestId`.
- **Nivel.** `LOG_LEVEL` (§9): `info` por defecto y `silent` en las pruebas, para no llenar su salida; las pruebas que leen los logs pasan su propio destino a `configureApp`.

### Lo que todavía no está

- **Serializar las respuestas con schema** (`StandardSchemaSerializerInterceptor` y `@SerializeOptions({ schema })` de Nest 12), para que una ruta nunca devuelva campos que el contrato no declara.
- **`Cache-Control: no-store`** en las demás respuestas con datos personales (las de autenticación ya lo llevan).
- **Registro total en Mongo (D-58).** La cola de BullMQ y el worker que guardan en Mongo los eventos de auditoría de autenticación (D-61, que ya salen por el log) y las líneas de log (el resto de los PRs 2 y 3 del plan). Hoy todo sale solo por la salida estándar.

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

- **Recarga en caliente:** la API corre con `nest start --watch` y el `src/` de tu máquina está montado dentro (de lectura y escritura, porque `prisma generate` escribe ahí el cliente): al guardar, se recompila y reinicia en unos 2 segundos. Un cambio en `package.json`, el lockfile o los archivos de configuración exige `pnpm docker:dev` otra vez (reconstruye la imagen).
- **Base de datos al arrancar:** el contenedor aplica las migraciones (`prisma migrate deploy`) y regenera el cliente de Prisma antes de iniciar la API: el montaje de `./src` oculta el cliente que generó la imagen. Un cambio en el esquema pide una migración nueva (`pnpm db:migrate`, en tu máquina) y reiniciar la API.
- **Personas de desarrollo:** `pnpm docker:seed` crea, con el mismo caso de uso que usará el registro, a Ana Pérez (`+573001234567`, contraseña `fiaro-dev-2026`) y a un cobrador con contraseña temporal (`+573109998877`, `temporal-2026`). Es idempotente y se niega a correr en producción. `pnpm docker:reset` borra los datos.
- **Depurador:** el puerto 9229 está publicado; en VS Code, «Attach» a `localhost:9229` con `remoteRoot` `/app`.
- **Conexiones:** la API recibe `DATABASE_URL`, `REDIS_URL`, `MONGODB_URI`, `S3_*` y `SMTP_*` apuntando a los servicios por su nombre en la red de Compose (`postgres`, `redis`...), y arranca cuando están sanos. Hoy solo usa `DATABASE_URL` (y las de better-auth); las demás están para que el primer módulo que las necesite solo tenga que declararlas en `src/config/env.ts` (sección 9). Desde tu máquina (Prisma Studio, `pnpm start:dev`) se usan los puertos publicados.
- **`.env`:** si existe, se pasa al contenedor; lo que define `compose.yaml` (`NODE_ENV`, `PORT`...) tiene prioridad.
- **Logs sin colores** (`NO_COLOR=1`), para que lleguen limpios a Loki; los que emite el compilador de TypeScript los limpia Alloy.
- **Usuario sin privilegios** (`node`) y `init: true`, para que las señales lleguen al proceso.
- **Por qué la imagen `dev` instala `procps`:** el CLI de Nest reinicia la API matando el proceso anterior con `tree-kill`, que usa `ps`, y la imagen `-slim` no lo trae. El proceso viejo seguía vivo, el nuevo fallaba con `EADDRINUSE` y la API seguía sirviendo el código anterior sin ningún error visible. Se descubrió al verificar la recarga.

### Pruebas (`compose.test.yaml`, target `test`)

- **Datos en memoria (`tmpfs`):** cada corrida arranca vacía y no queda nada que limpiar; además es más rápido que el disco.
- **Aislado del entorno de desarrollo:** puertos propios (5441, 6391, 27041, 8334, 1026 y 8026) y un proyecto distinto (`fiaro-test`), así que puede correr mientras tu stack de desarrollo está arriba y `pnpm docker:test` no puede tocarlo (el script fija el proyecto con `-p`).
- **Qué corre:** el contenedor `test` espera a que la infraestructura esté sana y ejecuta `pnpm test:cov`: unitarias y e2e juntas, con cobertura. Las e2e usan el PostgreSQL efímero (cada corrida crea su propia base de datos y la borra); Redis, Mongo y S3 quedan listos para las pruebas de integración de BullMQ, la auditoría y el almacenamiento cuando existan.
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
- **`prod`:** Node 24 `-slim`, solo las dependencias de runtime y `dist` (el cliente de Prisma se genera en el build), usuario `node` y código que no puede escribir. Pesa unos 560 MB sin comprimir. Se probó con `--read-only`, `--cap-drop ALL` y `no-new-privileges`. Sin `TRUST_PROXY` no arranca (sección 9). Su `HEALTHCHECK` abre una conexión TCP al puerto de la API.
- **Solo dependencias de runtime, y por qué hace falta un hook:** sin ajustes, `pnpm install --prod` dejaba la imagen en unos 940 MB, porque 206 de sus 362 paquetes eran herramientas de desarrollo (el CLI de Prisma, Prisma Studio, TypeScript, Vitest, React...). No las pedía nuestro código sino los peers opcionales de `@prisma/client`, `@better-auth/prisma-adapter` y `better-auth` (`prisma`, `typescript`, `vitest`, `react`, `react-dom` y `mysql2`): pnpm resuelve cada uno con lo que ya está en el árbol del proyecto, también las herramientas de desarrollo y sus dependencias, y lo anota en el lockfile como dependencia opcional del paquete; `--prod` conserva las opcionales. El hook `readPackage` de `.pnpmfile.cjs` quita esos peers de esos tres paquetes: el lockfile deja de enlazarlos y la imagen queda con las 156 dependencias que la API necesita. Es seguro porque el código que la API carga no los importa: `vitest` y `mysql2` solo los usa `better-auth/test`, `react` y `react-dom` solo `better-auth/react`, y `prisma` y `typescript` no los importa ningún paquete de runtime.
- **No se usó `--no-optional`:** también descartaría los binarios nativos que un paquete de runtime trae como dependencias opcionales (por ejemplo `sharp`, cuando llegue); el hook corta solo los enlaces que sobran.
- **`.pnpmfile.cjs` y el lockfile van juntos:** pnpm guarda el hash del archivo en el lockfile (`pnpmfileChecksum`) y `--frozen-lockfile` falla con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` si no coincide. Cualquier cambio al archivo, incluso a un comentario, exige `pnpm install` para regenerar el lockfile, y el `Dockerfile` lo copia junto con él (etapa `manifests`); sin esa copia la imagen no se construye. Si una dependencia nueva vuelve a arrastrar una herramienta de desarrollo, se agrega su peer a la lista del hook.
- **Comprobar el contenido de la imagen:** `docker run --rm --entrypoint sh <imagen> -c 'cd /app/node_modules/.pnpm && du -sh * | sort -h | tail -15'` no debe mostrar `prisma`, `typescript`, `vitest` ni `@prisma/studio-core`.
- **Debian, no Alpine**, en las imágenes de Node y de Postgres. Postgres: Alpine usa musl, que no soporta locales, y el orden de las consultas (`en_US.utf8`) no coincidiría con el de Neon. Node: glibc evita sorpresas con módulos nativos (Prisma, sharp). Además, Postgres 18 guarda los datos en `/var/lib/postgresql` (ya no en `.../data`) y el volumen se monta ahí.
- **Versiones:** Prometheus está en su línea LTS (3.13, con soporte hasta julio de 2027); el resto, en la última versión estable con al menos una semana publicada.

### Lo que todavía no está

- **Métricas de la API** (`/metrics`): el raspado se agrega a `docker/alloy/config.alloy` cuando exista. Los logs JSON de stdout ya llegan a Loki (§11, Logs).
- **`/health`:** el healthcheck de la API es por TCP; con el módulo `system` pasa a HTTP (también lo necesita Fly.io).
- **Cierre ordenado** (`enableShutdownHooks`): hoy no hay conexiones que cerrar; con Prisma y BullMQ sí.
- **Migraciones en producción:** la API no migra al arrancar: con varias instancias, todas competirían por aplicar las mismas migraciones, y la aplicación no debería tener permisos para alterar el esquema. Con el primer despliegue se agrega el paso que corre `prisma migrate deploy` antes de que arranque la versión nueva (por ejemplo, desde el CI contra la base de datos, o con el `release_command` de Fly.io). La imagen `prod` no trae el CLI de Prisma (es una dependencia de desarrollo): el `release_command` corre con la imagen de la versión nueva, así que usarlo exigiría otra imagen con el CLI; desde el CI, que sí lo tiene, no.
- **`fly.toml`** y el despliegue.
- **Trazas** (OpenTelemetry y Tempo): con un solo servicio no hacen falta; Alloy puede recibir OTLP cuando lleguen.