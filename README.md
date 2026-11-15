# Zémidjan Manager

Gestion des contrats de leasing moto/tricycle zémidjan : conducteurs,
versements (espèces et Mobile Money), échéanciers, alertes.

Monorepo pnpm :

- `apps/api` — NestJS + Prisma + PostgreSQL
- `apps/web` — Vue 3 + Pinia + Vite, PWA
- `packages/shared` — schémas Zod partagés

## Développement local (pas de Docker requis)

```bash
pnpm install
pnpm --filter api db:dev        # Postgres embarqué, à laisser tourner dans un terminal
pnpm --filter api start:dev     # API sur http://localhost:3000
pnpm --filter web dev           # Frontend sur http://localhost:5173 (proxy /api -> :3000)
```

Premier compte (pas d'auto-inscription) :

```bash
pnpm --filter api build
node apps/api/dist/scripts/seed-user.js email@exemple.com "mot-de-passe" "Nom"
```

## Tests

```bash
pnpm --filter api test
pnpm --filter web test
```

## Déploiement

Voir [`docs/deployment.md`](docs/deployment.md) (Railway, deux services `api`
+ `web`, Postgres, bucket S3-compatible).
