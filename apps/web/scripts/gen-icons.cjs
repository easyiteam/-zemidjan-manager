#!/usr/bin/env node
// Génère des icônes PWA placeholder (fond noir, badge jaune centré — reprend
// le motif du logo "ZM//" : badge jaune sur noir) sans dépendance d'image.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const BLACK = [0x14, 0x14, 0x12, 0xff];
const YELLOW = [0xf5, 0xc4, 0x00, 0xff];

function makePng(size, { maskable = false } = {}) {
  const badgeRatio = maskable ? 0.5 : 0.62; // safe-zone plus réduite pour les icônes maskable
  const badgeSize = Math.round(size * badgeRatio);
  const offset = Math.round((size - badgeSize) / 2);

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filtre "none"
    const inBadgeY = y >= offset && y < offset + badgeSize;
    for (let x = 0; x < size; x++) {
      const inBadgeX = x >= offset && x < offset + badgeSize;
      const color = inBadgeX && inBadgeY ? YELLOW : BLACK;
      const px = rowStart + 1 + x * 4;
      raw[px] = color[0];
      raw[px + 1] = color[1];
      raw[px + 2] = color[2];
      raw[px + 3] = color[3];
    }
  }

  const idatData = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idatData), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, "..", "public");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-192.png"), makePng(192));
fs.writeFileSync(path.join(outDir, "icon-512.png"), makePng(512));
fs.writeFileSync(path.join(outDir, "icon-maskable-512.png"), makePng(512, { maskable: true }));
console.log("[gen-icons] icônes générées dans apps/web/public/");
