# Build context = racine du monorepo. Non testé localement (pas de Docker sur
# la machine de dev) — à valider au premier déploiement Railway ; voir
# docs/deployment.md.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @zm/web... --filter @zm/shared

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @zm/shared build && pnpm --filter @zm/web build

FROM nginx:1.27-alpine
ENV PORT=8080
ENV API_ORIGIN=http://localhost:3000
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
