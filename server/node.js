#!/usr/bin/env node
// server/node.js — bootstrap: checks the Node version in plain JS BEFORE any
// TypeScript module loads (otherwise the error would be a cryptic
// ERR_UNKNOWN_FILE_EXTENSION). npm run dev / npm start point here.
import { loadDotEnv } from "./env.js";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

/** Version check; returns the error message or null. Exported for tests. */
export function checkNodeVersion(version) {
  const [maj = 0, min = 0] = String(version).split(".").map(Number);
  if (maj > 22 || (maj === 22 && min >= 18)) return null;
  return [
    `steady-page-kit v2 requires Node >= 22.18 (found: ${version}).`,
    "Please install Node 24 LTS — see the README 'Requirements' or your deploy recipe in docs/agent/deploy/.",
  ].join("\n");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const problem = checkNodeVersion(process.versions.node);
  if (problem) { console.error(problem); process.exit(1); }

  const ROOT = fileURLToPath(new URL("..", import.meta.url));
  loadDotEnv(ROOT + ".env");
  const { startServer } = await import("./node.ts");
  const server = await startServer();
  const { port } = server.address();
  const { IS_CONFIGURED } = await import("../functions/_lib/config.ts");
  const configured = IS_CONFIGURED || !!process.env.FEED_URL || !!process.env.STEADY_SLUG;
  const hint = configured ? "" : `  (not configured yet → onboarding page; tell your AI tool: "Set up my page")`;
  console.log(`steady-page-kit running at http://localhost:${port}${hint}`);
}
