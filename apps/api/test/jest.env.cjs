"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HANDLE_FILE = path.join(os.tmpdir(), "zm-test-pg.json");
if (fs.existsSync(HANDLE_FILE)) {
  const { ownerUrl, appUrl } = JSON.parse(fs.readFileSync(HANDLE_FILE, "utf8"));
  process.env.DATABASE_URL = ownerUrl;
  process.env.APP_DATABASE_URL = appUrl;
}

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.STORAGE_DRIVER = "memory";
process.env.WEB_ORIGIN = "http://localhost:5173";
