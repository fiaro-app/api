# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.21.0

FROM node:${NODE_VERSION}-slim AS base
ENV COREPACK_HOME=/usr/local/share/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# pnpm queda descargado en una ruta común: cualquier usuario del contenedor lo usa sin red.
# `.pnpmfile.cjs` viaja con el lockfile: pnpm compara su hash y sin él `--frozen-lockfile` falla.
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .pnpmfile.cjs ./
RUN corepack install

# `@fiaro-app/contracts` es privado: el token entra como secreto de BuildKit y solo existe
# mientras corre este RUN, así que no queda en ninguna capa ni en el historial de la imagen.
FROM manifests AS deps
RUN --mount=type=secret,id=NODE_AUTH_TOKEN \
    --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    test -s /run/secrets/NODE_AUTH_TOKEN \
      || { echo 'Falta el secreto NODE_AUTH_TOKEN (ver README, "Acceso a @fiaro-app/contracts")' >&2; exit 1; }; \
    printf '//npm.pkg.github.com/:_authToken=%s\n' "$(cat /run/secrets/NODE_AUTH_TOKEN)" > ~/.npmrc \
    && pnpm install --frozen-lockfile --ignore-scripts --store-dir=/pnpm/store \
    && rm ~/.npmrc

# `procps` aporta `ps`: sin él, el CLI de Nest no puede terminar el proceso anterior al recargar
# y el nuevo falla con EADDRINUSE mientras el viejo sigue sirviendo el código antiguo. `openssl` lo
# busca el motor de migraciones de Prisma; la imagen `-slim` no lo trae y Prisma avisa en cada comando.
# Las dependencias de la imagen son inmutables: pnpm no debe intentar reinstalarlas antes de un script.
# El CLI de Prisma descarga el motor de migraciones la primera vez que se usa (pnpm no ejecuta el
# script de instalación que lo haría): se hace aquí, como root, para que quede en la imagen y
# `migrate deploy` no dependa de la red ni de permisos al arrancar.
# Al arrancar, el contenedor aplica las migraciones y regenera el cliente de Prisma: `./src` está
# montado desde tu máquina y oculta el que generó la imagen.
FROM deps AS dev
ENV NODE_ENV=development \
    pnpm_config_verify_deps_before_run=false \
    PRISMA_HIDE_UPDATE_MESSAGE=1
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends procps openssl \
    && rm -rf /var/lib/apt/lists/*
RUN pnpm exec prisma --version
COPY --chown=node:node . .
RUN chown node:node /app
USER 1000:1000
RUN pnpm exec prisma generate
EXPOSE 3000 9229
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma generate && exec node_modules/.bin/nest start --debug 0.0.0.0:9229 --watch --preserveWatchOutput"]

FROM dev AS test
ENV NODE_ENV=test \
    CI=true
CMD ["pnpm", "test:cov"]

FROM deps AS build
COPY . .
RUN pnpm build

FROM manifests AS prod-deps
RUN --mount=type=secret,id=NODE_AUTH_TOKEN \
    --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    test -s /run/secrets/NODE_AUTH_TOKEN \
      || { echo 'Falta el secreto NODE_AUTH_TOKEN (ver README, "Acceso a @fiaro-app/contracts")' >&2; exit 1; }; \
    printf '//npm.pkg.github.com/:_authToken=%s\n' "$(cat /run/secrets/NODE_AUTH_TOKEN)" > ~/.npmrc \
    && pnpm install --frozen-lockfile --prod --ignore-scripts --store-dir=/pnpm/store \
    && rm ~/.npmrc

FROM node:${NODE_VERSION}-slim AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "--enable-source-maps", "dist/main"]
