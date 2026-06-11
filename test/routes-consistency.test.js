// Eine Routen-Wahrheit: jede functions/-Routendatei steht in ROUTES und umgekehrt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ROUTES } from "../server/routes.ts";

test("ROUTES ↔ functions/-Ordner sind deckungsgleich", () => {
  const root = fileURLToPath(new URL("../functions/", import.meta.url));
  const found = [];
  const walk = (dir, prefix) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name !== "_lib") walk(dir + e.name + "/", prefix + e.name + "/");
      else if (e.isFile() && e.name.endsWith(".ts")) found.push("functions/" + prefix + e.name);
    }
  };
  walk(root, "");
  const inRoutes = ROUTES.map(r => r.src).sort();
  const inTree = found.filter(f => !f.startsWith("functions/_lib/")).sort();
  assert.deepEqual(inTree, inRoutes);
});
