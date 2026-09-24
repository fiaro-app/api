# Fiaro — API

Backend del sistema de control de cartera (gota a gota) de Fiaro: un SaaS multi-tenant para que dueños de comercio (Owners) gestionen la operación de uno o varios prestamistas (Lenders) de crédito informal de cobro diario. El sistema no calcula intereses ni procesa pagos reales — es un libro de control (ledger) de acuerdos pactados manualmente, con seguimiento de cobro en campo.

Repo privado. Software propietario — ver [LICENSE](./LICENSE).

Documento de dominio y producto (entidades, multi-tenancy, suscripciones, roadmap): [PRODUCT.md](./PRODUCT.md). Arquitectura de código de este repo: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

NestJS 12 · TypeScript 6.0 estricto · `@fiaro-app/contracts` · Prisma · PostgreSQL · Redis + BullMQ · MongoDB (auditoría) · Vitest + SWC · ESLint + Prettier · pnpm · Docker Compose · Fly.io

Detalle completo, estructura de carpetas y convenciones de código en [ARCHITECTURE.md](./ARCHITECTURE.md).

## Requisitos

- Node 24 (versión en `.nvmrc`)
- pnpm 11 (`corepack enable` si no lo tienes activado)
- Acceso de lectura a `@fiaro-app/contracts`, un paquete privado ([cómo](#acceso-a-fiaro-appcontracts))
- Docker (OrbStack o Docker Desktop) para el [entorno local](#entorno-local-con-docker)

## Empezar

Con Docker, todo el entorno de desarrollo en un comando (bases de datos, almacenamiento, correo y la API con recarga en caliente):

```bash
pnpm docker:dev
```

Sin Docker, o para depurar la API en tu máquina (`pnpm docker:infra` levanta solo la infraestructura):

```bash
pnpm install      # también instala los hooks de git (script prepare)
pnpm start:dev
```

La documentación de la API está en `/docs` (solo fuera de producción): <http://localhost:3040/docs> con Docker, <http://localhost:3000/docs> con `pnpm start:dev`.

## Entorno local con Docker

Cada servicio queda en tu máquina (solo en `127.0.0.1`) con puertos distintos de los estándar, para que no choquen con otros proyectos:

| Servicio | URL o puerto | Credenciales |
|---|---|---|
| API | <http://localhost:3040> (depurador en `9229`) | — |
| PostgreSQL | `localhost:5440` | `fiaro` / `fiaro`, base `fiaro` |
| Redis | `localhost:6390` | — |
| MongoDB | `localhost:27040` | `fiaro` / `fiaro` |
| S3 (SeaweedFS) | <http://localhost:8333>, bucket `fiaro-dev` | `fiaro` / `fiaro-secret` |
| Mailpit (correos) | SMTP `localhost:1025`, interfaz <http://localhost:8025> | — |

Con `pnpm docker:dev:obs` se suma la observabilidad:

| Servicio | URL | Credenciales |
|---|---|---|
| Grafana | <http://localhost:3030> | `admin` / `admin` |
| Prometheus | <http://localhost:9090> | — |
| Loki, Alloy, cAdvisor | `localhost:3100`, `localhost:12345`, `localhost:8081` | — |

| Comando | Qué hace |
|---|---|
| `pnpm docker:dev` | Infraestructura y API con recarga en caliente |
| `pnpm docker:dev:obs` | Lo anterior más Prometheus, cAdvisor, Loki, Alloy y Grafana |
| `pnpm docker:infra` | Solo la infraestructura (la API corre en tu máquina) |
| `pnpm docker:test` | La suite completa dentro de Docker, con infraestructura efímera |
| `pnpm docker:down` | Detiene todo y conserva los datos |
| `pnpm docker:reset` | Detiene todo y borra los datos |

Construir la imagen necesita el token de `@fiaro-app/contracts`: los scripts lo toman de tu sesión de `gh` (o de `NODE_AUTH_TOKEN`, si ya lo tienes). Los puertos, las credenciales, cómo funcionan las pruebas en contenedores y la observabilidad están en [ARCHITECTURE.md §12](./ARCHITECTURE.md#12-entorno-local-con-docker).

## Acceso a `@fiaro-app/contracts`

Es un paquete privado en GitHub Packages, que exige autenticación para instalarlo aunque sea tuyo. El `.npmrc` del repo solo dice dónde está (`@fiaro-app:registry`); las credenciales van fuera del repo, en tu `~/.npmrc` (carpeta personal):

```ini
@fiaro-app:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

La línea del token no puede ir en el `.npmrc` del repo: pnpm 11 ignora las variables de entorno en las credenciales de un `.npmrc` de proyecto, para que un archivo commiteado no pueda filtrar secretos.

Para instalar, con la sesión de `gh` (necesita el permiso `read:packages`: `gh auth refresh -s read:packages`):

```bash
NODE_AUTH_TOKEN=$(gh auth token) pnpm install
```

También sirve un token clásico con solo `read:packages` en `NODE_AUTH_TOKEN`. Definir esa variable vacía en tu shell (`export NODE_AUTH_TOKEN=`) evita el aviso `Failed to replace env in config` de pnpm en el resto de los comandos.

El CI lo instala con el `GITHUB_TOKEN` del workflow: el paquete debe dar acceso de lectura al repo `api` (Package settings → Manage Actions access). Las imágenes de Docker reciben el token como secreto de BuildKit: no queda en ninguna capa.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm start:dev` | Servidor en modo watch |
| `pnpm lint` | ESLint con reglas que usan tipos y la regla de capas |
| `pnpm lint:fix` | ESLint corrigiendo lo que se pueda |
| `pnpm format` | Formatea con Prettier |
| `pnpm format:check` | Verifica el formato sin cambiar archivos |
| `pnpm typecheck` | `tsc --noEmit`, incremental |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm test:cov` | Tests unitarios con cobertura (mínimo 80 %) |
| `pnpm test:e2e` | Tests end-to-end |
| `pnpm build` | Build de producción (`dist/`) |
| `pnpm docs` | Genera documentación (Compodoc) en `docs/` |

El pipeline de CI (`.github/workflows/ci.yml`) corre lint → formato → typecheck → test con cobertura → test:e2e → build → docs → análisis de Sonar en cada PR y en cada push a `dev`. En paralelo, un job `docker` valida los archivos de Compose, construye la imagen de producción, comprueba que arranca y corre la suite en contenedores.

## Hooks de git

`pnpm install` instala los hooks con Husky:

- **pre-commit**: ESLint, Prettier y las pruebas relacionadas, solo sobre los archivos en staging.
- **commit-msg**: el mensaje debe seguir [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) (`feat:`, `fix:`, `docs:`...).
- **pre-push**: typecheck incremental y las pruebas afectadas por los cambios de la rama.

Detalle y razones en [ARCHITECTURE.md §8](./ARCHITECTURE.md#8-herramientas-hooks-y-caché).

## Variables de entorno

Se validan al arrancar: si alguna es inválida el proceso no arranca y el error dice cuál. En desarrollo todas son opcionales; copia `.env.example` a `.env` si quieres cambiar alguna (por ejemplo `CORS_ORIGINS`, para probar el panel web). En producción `TRUST_PROXY` es obligatoria. Cada una se explica en [ARCHITECTURE.md](./ARCHITECTURE.md#9-variables-de-entorno) y la seguridad HTTP que las usa, en la [sección 11](./ARCHITECTURE.md#11-seguridad-http). Nunca se commitea un `.env` real.

## Ramas y flujo de trabajo

- `dev` es la rama de integración y la rama por defecto — todo PR apunta aquí.
- `main` es producción — se actualiza vía PR desde `dev` cuando está estable.
- **PR de funcionalidad** (rama → `dev`): merge por **squash**, un commit por PR.
- **PR de release** (`dev` → `main`): **merge commit**. Así `main` y `dev` comparten historia y el siguiente release no tiene conflictos; con squash, `main` quedaría con un commit que `dev` no tiene.
- La rama de origen se borra automáticamente al mergear (`dev` nunca, porque es la rama por defecto).
- Sin protección de rama activa (equipo de una persona por ahora).

## Repos relacionados

| Repo | Contenido |
|---|---|
| [fiaro-app/mobile](https://github.com/fiaro-app/mobile) | App móvil para administradores y cobradores (Expo) |
| [fiaro-app/web](https://github.com/fiaro-app/web) | Panel web (Next.js, fase 2) |
| [fiaro-app/contracts](https://github.com/fiaro-app/contracts) | Schemas de Zod compartidos (`@fiaro-app/contracts`) |
