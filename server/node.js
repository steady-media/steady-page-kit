#!/usr/bin/env node
// server/node.js — Bootstrap: prüft die Node-Version in plain JS, BEVOR
// TypeScript-Module geladen werden (sonst wäre der Fehler ein kryptisches
// ERR_UNKNOWN_FILE_EXTENSION). npm run dev / npm start zeigen hierher.
import { loadDotEnv } from "./env.js";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

/** Versions-Check; liefert die Fehlermeldung oder null. Exportiert für Tests. */
export function checkNodeVersion(version) {
  const [maj = 0, min = 0] = String(version).split(".").map(Number);
  if (maj > 22 || (maj === 22 && min >= 18)) return null;
  return [
    `steady-page-kit v2 braucht Node >= 22.18 (gefunden: ${version}).`,
    "DE: Bitte Node 24 LTS installieren — siehe README «Voraussetzungen» bzw. dein Deploy-Rezept in docs/agent/deploy/.",
    "EN: Please install Node 24 LTS — see README 'Requirements' or your deploy recipe in docs/agent/deploy/.",
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
  const hint = configured ? "" : `  (noch unkonfiguriert → Onboarding-Seite; sage deinem KI-Tool: „Richte meine Seite ein“)`;
  console.log(`steady-page-kit läuft auf http://localhost:${port}${hint}`);
}
