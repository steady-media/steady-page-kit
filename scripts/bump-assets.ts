// scripts/bump-assets.ts — ASSET_VERSION + Hash-Fixture in EINEM Schritt aktualisieren.
// `npm run bump-assets` nach jeder Änderung an public/assets/kit.css|kit-*.js.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ASSETS = ["public/assets/kit.css", "public/assets/kit-theme.js", "public/assets/kit-panel.js"];

const h = createHash("sha256");
for (const f of ASSETS) h.update(readFileSync(ROOT + f));
const hash = h.digest("hex");

const today = new Date().toISOString().slice(0, 10);
const cfgPath = ROOT + "functions/_lib/config.ts";
const cfg = readFileSync(cfgPath, "utf8");
const m = cfg.match(/ASSET_VERSION = "([^"]+)"/);
if (!m) { console.error("ASSET_VERSION nicht gefunden"); process.exit(1); }
const cur = m[1]!;
// Format YYYY-MM-DD<buchstabe>: gleicher Tag → Buchstabe hochzählen, sonst neuer Tag + "a"
const next = cur.startsWith(today)
  ? today + String.fromCharCode((cur.slice(10) || "a").charCodeAt(0) + 1)
  : today + "a";
writeFileSync(cfgPath, cfg.replace(/ASSET_VERSION = "[^"]+"/, `ASSET_VERSION = "${next}"`));
writeFileSync(ROOT + "test/asset-hash.json", JSON.stringify({ assetVersion: next, hash }, null, 2) + "\n");
console.log(`ASSET_VERSION: ${cur} → ${next}`);
