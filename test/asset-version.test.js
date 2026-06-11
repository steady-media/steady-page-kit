// Hard Rule 4 als CI-Garantie: Asset-Änderung ohne Versions-Bump = rot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ASSET_VERSION } from "../functions/_lib/config.ts";

const ASSETS = ["public/assets/kit.css", "public/assets/kit-theme.js", "public/assets/kit-panel.js"];

test("ASSET_VERSION passt zum Asset-Hash (sonst: npm run bump-assets)", () => {
  const h = createHash("sha256");
  for (const f of ASSETS) h.update(readFileSync(new URL("../" + f, import.meta.url)));
  const rec = JSON.parse(readFileSync(new URL("./asset-hash.json", import.meta.url), "utf8"));
  assert.equal(rec.assetVersion, ASSET_VERSION, "config.ts und Fixture sind auseinander");
  assert.equal(rec.hash, h.digest("hex"), "Assets geändert ohne npm run bump-assets");
});
