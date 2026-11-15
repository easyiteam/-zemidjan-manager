// Monte une Postgres embarquée jetable pour la session de tests (une par
// run), génère un schéma via `prisma db push`, et écrit les infos de
// connexion dans un fichier JSON lu par jest.env.cjs (setupFiles) et par
// global-teardown.cjs — nécessaire car Jest exécute globalSetup/Teardown et
// les workers de test dans des process Node séparés.
"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HANDLE_FILE = path.join(os.tmpdir(), "zm-test-pg.json");
const PORT = 54330;
const DB_NAME = `zm_test_${Date.now()}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "zm-pgtest-"));

module.exports = async function globalSetup() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB_NAME);

  const ownerUrl = `postgresql://postgres:postgres@localhost:${PORT}/${DB_NAME}`;
  const appUrl = `postgresql://zm_app_user:zm_app_password@localhost:${PORT}/${DB_NAME}`;
  const env = { ...process.env, DATABASE_URL: ownerUrl, APP_DATABASE_URL: appUrl };

  execFileSync("node", [path.join(__dirname, "..", "scripts", "db-bootstrap.cjs")], {
    env,
    stdio: "inherit",
  });
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
    cwd: path.join(__dirname, ".."),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  fs.writeFileSync(
    HANDLE_FILE,
    JSON.stringify({ dataDir, port: PORT, dbName: DB_NAME, ownerUrl, appUrl }),
  );

  process.env.DATABASE_URL = ownerUrl;
  process.env.APP_DATABASE_URL = appUrl;
};
