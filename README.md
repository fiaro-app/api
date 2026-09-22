# Fiaro — API

Backend del sistema de control de cartera (gota a gota) de Fiaro: un SaaS multi-tenant para que dueños de comercio (Owners) gestionen la operación de uno o varios prestamistas (Lenders) de crédito informal de cobro diario. El sistema no calcula intereses ni procesa pagos reales — es un libro de control (ledger) de acuerdos pactados manualmente, con seguimiento de cobro en campo.

Repo privado. Software propietario — ver [LICENSE](./LICENSE).

## Stack

NestJS 12 · TypeScript estricto · Prisma (pendiente) · PostgreSQL · Redis + BullMQ · MongoDB (auditoría) · pnpm · Fly.io

Detalle completo, estructura de carpetas y convenciones de código en [ARCHITECTURE.md](./ARCHITECTURE.md).

## Requisitos

- Node 24
- pnpm 11 (`corepack enable` si no lo tienes activado)

## Empezar

```bash
pnpm install
pnpm start:dev
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm start:dev` | Servidor en modo watch |
| `pnpm lint` | oxlint, type-aware |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm test:e2e` | Tests end-to-end |
| `pnpm build` | Build de producción (`dist/`) |
| `pnpm docs` | Genera documentación (Compodoc) en `docs/` |

El pipeline de CI (`.github/workflows/ci.yml`) corre lint → typecheck → test → test:e2e → build → docs → análisis de Sonar en cada PR y en cada push a `dev`.

## Variables de entorno

Todavía no hay ninguna wireada (Prisma/Redis/Mongo no están instalados). Se documentan en [ARCHITECTURE.md](./ARCHITECTURE.md#8-variables-de-entorno) y en `.env.example` a medida que se agregan. Nunca se commitea un `.env` real.

## Ramas y flujo de trabajo

- `dev` es la rama de integración y la rama por defecto — todo PR apunta aquí.
- `main` es producción — se actualiza vía PR desde `dev` cuando está estable.
- Merge siempre por squash; la rama de origen se borra automáticamente al mergear.
- Sin protección de rama activa (equipo de una persona por ahora).

## Repos relacionados

| Repo | Contenido |
|---|---|
| [fiaro-app/web](https://github.com/fiaro-app/web) | Panel de Owner/Lender (Next.js) |
| [fiaro-app/mobile](https://github.com/fiaro-app/mobile) | App del Collector (Expo) |
| [fiaro-app/contracts](https://github.com/fiaro-app/contracts) | Schemas de Zod compartidos (`@fiaro-app/contracts`) |
