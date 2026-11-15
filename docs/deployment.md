# Déploiement Railway — Zémidjan Manager

Monorepo pnpm avec deux services déployés séparément (`api` + `web`), une base
PostgreSQL et un bucket S3-compatible pour les captures MoMo. Le navigateur ne
parle **qu'au service `web`** (cookie de refresh same-site) ; `web` relaie
`/api/*` vers le domaine **public** de `api` (le navigateur ne peut pas
atteindre le réseau privé Railway).

> Railway a déprécié `railway.toml`/`railway.json` (lecture arrêtée le
> 2026-12-01) au profit de l'Infra-as-Code (`railway config init` /
> `.railway/railway.ts`) ou de la configuration live via
> `railway environment edit --service-config`. Ce document ne contient donc
> pas de fichier de config Railway committé — les commandes ci-dessous sont à
> exécuter (ou à transformer en `.railway/railway.ts`) au moment du premier
> déploiement réel, une fois le projet Railway créé.

## 1. Services à provisionner

| Service | Nature | Rôle |
|---|---|---|
| `postgres` | Plugin Railway Postgres | Base de données |
| `media` (ou équivalent) | Bucket S3-compatible Railway, ou Cloudflare R2/Backblaze B2 si le bucket Railway n'est pas disponible | Captures MoMo |
| `api` | Service applicatif | NestJS, `apps/api/Dockerfile` |
| `web` | Service applicatif | nginx + PWA statique, `apps/web/Dockerfile` |

```bash
railway add --database postgres --json
railway bucket create --json   # ou configurer S3_* vers R2/B2 si indisponible
railway add --service api --json
railway add --service web --json
```

## 2. Builder : Dockerfile (recommandé) vs Railpack

Les deux `Dockerfile` du repo (`apps/api/Dockerfile`, `apps/web/Dockerfile`)
construisent depuis la **racine du monorepo** (nécessaire pour résoudre
`@zm/shared` via pnpm workspaces), avec un `.dockerignore` à la racine
excluant `node_modules`/`dist`/etc. (sans quoi les `COPY` ré-y injectent les
binaires natifs Windows du poste de dev par-dessus ceux installés dans
l'image Linux).

Pas de Docker sur la machine de développement, donc pas de `docker build`
possible — mais chaque étape de chaque `Dockerfile` (install filtré,
`prisma generate`, build, install `--prod`, démarrage de `dist/main.js`) a
été rejouée à la main dans des dossiers temporaires reproduisant exactement
les `COPY`/`RUN` de l'image, jusqu'à voir l'API échouer uniquement sur
`Can't reach database server` (attendu, pas de vraie base dans la
simulation). Un premier essai réel sur Railway avait échoué sur deux bugs
trouvés par cette méthode : `tsconfig.base.json` jamais copié dans l'image
(cassait tout le build TS) et `prisma` (le CLI) laissé en devDependency,
absent de l'install `--prod` de l'étage runtime — tous deux corrigés et
revérifiés de la même façon. Si un nouvel échec de build apparaît,
reproduire ainsi avant de pousser un nouveau correctif à l'aveugle ; sinon
inspecter `railway logs --service <svc> --build`.

```bash
railway environment edit --service-config api build.builder DOCKERFILE
railway environment edit --service-config api build.dockerfilePath apps/api/Dockerfile

railway environment edit --service-config web build.builder DOCKERFILE
railway environment edit --service-config web build.dockerfilePath apps/web/Dockerfile
```

Alternative sans Dockerfile pour `api` (Railpack, cf. pattern "shared
monorepo" de Railway — ne pas fixer `rootDirectory`) :

```bash
railway environment edit --service-config api build.buildCommand "pnpm --filter @zm/shared build && pnpm --filter @zm/api build"
railway environment edit --service-config api deploy.startCommand "pnpm --filter @zm/api start"
```

Le service `web` a besoin de relayer `/api/*` vers `api` (pas seulement de
servir des fichiers statiques) : garder le Dockerfile nginx pour ce service,
même si `api` passe en Railpack.

## 3. Domaines

À créer **avant** l'étape Variables : `RAILWAY_PUBLIC_DOMAIN` d'un service
n'existe comme variable référençable (`${{api.RAILWAY_PUBLIC_DOMAIN}}`) qu'une
fois son domaine généré — y référencer un domaine pas encore créé résout vide.

```bash
railway domain --service api --json
railway domain --service web --json
```

Seul le domaine de `web` est destiné aux utilisateurs ; celui de `api` ne sert
qu'au relais nginx (peut rester un domaine `*.up.railway.app` généré).

## 4. Variables

`api` :

```bash
railway variable set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service api
railway variable set NODE_ENV=production --service api
railway variable set JWT_ACCESS_SECRET="$(openssl rand -hex 32)" --service api
railway variable set JWT_REFRESH_SECRET="$(openssl rand -hex 32)" --service api
railway variable set STORAGE_DRIVER=s3 --service api
railway variable set S3_ENDPOINT=<endpoint-du-bucket> --service api
railway variable set S3_REGION=<region> --service api
railway variable set S3_ACCESS_KEY=<clé> --service api
railway variable set S3_SECRET_KEY=<secret> --service api
railway variable set S3_BUCKET=<nom-du-bucket> --service api
railway variable set WEB_ORIGIN='https://${{web.RAILWAY_PUBLIC_DOMAIN}}' --service api
```

(`WEB_ORIGIN` ne sert que de garde-fou CORS — en usage normal le navigateur ne
parle qu'au domaine `web`, jamais directement à `api`.)

`APP_DATABASE_URL` (rôle applicatif à droits limités, cf.
`apps/api/scripts/db-bootstrap.cjs`) doit être généré une fois (mot de passe
aléatoire) puis fixé comme variable, **avant** le premier déploiement :

```bash
railway variable set APP_DATABASE_URL="postgresql://zm_app_user:$(openssl rand -hex 24)@\${{RAILWAY_PRIVATE_DOMAIN}}:5432/railway" --service api
```

(ajuster le nom de base/host selon la sortie de `railway variable list --service postgres`).

`api` — pré-déploiement (bootstrap du rôle + migrations) :

```bash
railway environment edit --service-config api deploy.preDeployCommand "node scripts/db-bootstrap.cjs && pnpm exec prisma migrate deploy"
railway environment edit --service-config api deploy.healthcheckPath /api/health
```

`web` — l'image nginx écoute déjà sur `$PORT` (injecté par Railway) via
`envsubst` au démarrage ; seule variable à poser est la cible du relais
`/api/*` :

```bash
railway variable set API_ORIGIN='https://${{api.RAILWAY_PUBLIC_DOMAIN}}' --service web
```

## 5. Premier déploiement

Ordre : `postgres` et le bucket doivent exister avant `api` (migrations +
bootstrap du rôle au premier démarrage) ; `web` après `api` (a besoin de son
domaine public pour `API_ORIGIN`).

```bash
railway up --service api --detach -m "premier déploiement api"
# attendre SUCCESS (railway deployment list --service api --json)
railway up --service web --detach -m "premier déploiement web"
```

## 6. Créer le premier compte

Pas d'auto-inscription dans l'appli — après le premier déploiement réussi de
`api` :

```bash
railway run --service api -- node dist/scripts/seed-user.js gerant@exemple.com "mot-de-passe-fort" "Nom du gérant"
```

Répéter pour chaque personne devant avoir accès (ex. un gérant).

## 7. Vérifications post-déploiement

- `curl https://<domaine-web>/api/health` → `{"status":"ok",...}` (via le relais nginx)
- Se connecter sur `https://<domaine-web>` avec le compte créé à l'étape 6
- Créer un contrat, enregistrer un versement espèces puis MoMo avec capture, vérifier l'export CSV
- `railway logs --service api --lines 100` sans erreur au démarrage
