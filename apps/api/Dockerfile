# Build context = racine du monorepo (nécessaire pour pnpm workspaces).
# Non testé localement (pas de Docker sur la machine de dev) — à valider au
# premier déploiement Railway ; voir docs/deployment.md.
FROM node:22-slim AS base
# node:22-slim (Debian 12 "bookworm") n'a pas libssl par défaut : le moteur
# Prisma ne peut ni détecter la version OpenSSL au `generate` (il se rabat
# sur le mauvais défaut "1.1.x") ni trouver la lib au runtime sans ceci.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @zm/api... --filter @zm/shared

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @zm/shared build
RUN pnpm --filter @zm/api exec prisma generate
RUN pnpm --filter @zm/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json /repo/pnpm-lock.yaml ./
COPY --from=build /repo/packages/shared/package.json packages/shared/package.json
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/package.json apps/api/package.json
RUN pnpm install --prod --frozen-lockfile --filter @zm/api... --filter @zm/shared
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/scripts apps/api/scripts
COPY --from=build /repo/apps/api/prisma apps/api/prisma
RUN cd apps/api && pnpm exec prisma generate

WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
