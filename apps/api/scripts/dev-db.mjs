#!/usr/bin/env node
// Postgres embarqué pour le développement local (pas de Docker sur cette
// machine). Persistant dans apps/api/.pgdata, à laisser tourner dans un
// terminal pendant le développement (pnpm --filter api db:dev).
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", ".pgdata");
const PORT = 54329;
const DB_NAME = "zm_dev";
const OWNER_URL = `postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}`;
const APP_URL = `postgresql://zm_app_user:zm_app_password@localhost:${PORT}/${DB_NAME}`;

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

async function main() {
  const alreadyInitialised = existsSync(path.join(dataDir, "PG_VERSION"));
  if (!alreadyInitialised) {
    console.log(`[dev-db] initialisation de Postgres dans ${dataDir}…`);
    await pg.initialise();
  }
  await pg.start();
  console.log(`[dev-db] Postgres embarqué démarré sur le port ${PORT}.`);

  try {
    await pg.createDatabase(DB_NAME);
  } catch {
    // la base existe déjà — ok
  }

  const bootstrap = spawnSync("node", [path.join(__dirname, "db-bootstrap.cjs")], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: OWNER_URL, APP_DATABASE_URL: APP_URL },
  });
  if (bootstrap.status !== 0) {
    console.error("[dev-db] échec du bootstrap du rôle applicatif.");
  }

  console.log("\n[dev-db] Prêt. Variables à utiliser dans apps/api/.env :");
  console.log(`  DATABASE_URL="${OWNER_URL}"`);
  console.log(`  APP_DATABASE_URL="${APP_URL}"`);
  console.log("\n[dev-db] Laissez ce terminal ouvert. Ctrl+C pour arrêter proprement.\n");

  const shutdown = async () => {
    console.log("\n[dev-db] arrêt de Postgres…");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // garde le process vivant tant que Postgres embarqué tourne
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("[dev-db] erreur fatale :", err);
  process.exit(1);
});
