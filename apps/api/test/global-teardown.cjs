"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HANDLE_FILE = path.join(os.tmpdir(), "zm-test-pg.json");

module.exports = async function globalTeardown() {
  if (!fs.existsSync(HANDLE_FILE)) return;
  const { dataDir, port } = JSON.parse(fs.readFileSync(HANDLE_FILE, "utf8"));

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
  });
  try {
    await pg.stop();
  } catch {
    // déjà arrêtée — ok
  }

  // Sous Windows, pg.stop() peut résoudre avant que postgres.exe (et ses
  // process auxiliaires) n'aient réellement libéré leurs fichiers — on
  // attend la disparition de postmaster.pid avant de nettoyer, borné à 5s.
  const pidFile = path.join(dataDir, "postmaster.pid");
  const deadline = Date.now() + 5000;
  while (fs.existsSync(pidFile) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
  }

  try {
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch (err) {
    console.warn(`[global-teardown] nettoyage de ${dataDir} différé : ${err.message}`);
  }
  fs.rmSync(HANDLE_FILE, { force: true });
};
