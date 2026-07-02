#!/usr/bin/env node
// preview-template.js — swap a template's skin into the kit so you can preview it
// on real feed data, then restore. Style-only; touches only public/assets/kit.css.
//
//   node scripts/preview-template.js <name>      swap templates/<name>/skin.css in
//   node scripts/preview-template.js --restore   restore the real kit.css (via git)
//
// After swapping, run `npm run dev` and open http://localhost:8788 (hard-refresh to
// bust the CSS cache). Point at any publication with FEED_URL=... npm run dev.

import { existsSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kitCss = join(root, "public", "assets", "kit.css");
const arg = process.argv[2];

if (!arg) {
  console.error("usage: node scripts/preview-template.js <name> | --restore");
  process.exit(1);
}

if (arg === "--restore") {
  // kit.css is tracked, so git restores the pristine file exactly.
  execFileSync("git", ["checkout", "--", "public/assets/kit.css"], { cwd: root, stdio: "inherit" });
  console.log("✓ restored public/assets/kit.css");
  process.exit(0);
}

const skin = join(root, "templates", arg, "skin.css");
if (!existsSync(skin)) {
  console.error(`✗ no template at templates/${arg}/skin.css`);
  process.exit(1);
}

copyFileSync(skin, kitCss);
console.log(`✓ swapped templates/${arg}/skin.css → public/assets/kit.css

  next:
    npm run dev                 # http://localhost:8788 (hard-refresh to bust CSS cache)
    FEED_URL=https://steady.page/<slug>/rss npm run dev   # preview on a real feed

  when done:
    node scripts/preview-template.js --restore`);
