#!/usr/bin/env node
// Bootstrap idempotent du rôle applicatif Postgres (app_user).
// Exécuté en dev (après dev-db.mjs), en test (global-setup.cjs) et en
// production avant chaque déploiement (railway.toml -> preDeployCommand).
//
// DATABASE_URL = rôle propriétaire (DDL/migrations).
// APP_DATABASE_URL = rôle applicatif, utilisé à l'exécution par PrismaService.
"use strict";

const { Client } = require("pg");

function parseUrl(url) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

async function main() {
  const ownerUrl = process.env.DATABASE_URL;
  const appUrl = process.env.APP_DATABASE_URL;
  if (!ownerUrl) throw new Error("DATABASE_URL manquant");
  if (!appUrl) throw new Error("APP_DATABASE_URL manquant");

  const app = parseUrl(appUrl);
  const client = new Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${app.user}') THEN
           CREATE ROLE "${app.user}" LOGIN PASSWORD '${app.password}';
         ELSE
           ALTER ROLE "${app.user}" PASSWORD '${app.password}';
         END IF;
       END $$;`,
    );
    await client.query(`GRANT CONNECT ON DATABASE "${app.database}" TO "${app.user}"`);
    await client.query(`GRANT USAGE ON SCHEMA public TO "${app.user}"`);
    await client.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${app.user}"`,
    );
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${app.user}"`);
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${app.user}"`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${app.user}"`,
    );
    console.log(`[db-bootstrap] rôle "${app.user}" prêt sur la base "${app.database}".`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[db-bootstrap] échec :", err);
  process.exit(1);
});
