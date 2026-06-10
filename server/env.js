// server/env.js — .env-Loader für den Node-Pfad.
//
// Bewusst NICHT `node --env-file`: das crasht, wenn die Datei fehlt (Node < 22.9) —
// und ein frischer Template-Clone HAT noch keine .env. Hier: still tolerant.
// Bestehende Umgebungsvariablen werden nie überschrieben (gleiches Verhalten
// wie --env-file), damit Host-Konfiguration (Render, Fly, Docker) gewinnt.

import { readFileSync } from "node:fs";

/** .env laden; fehlende Datei ist ok. Liefert true, wenn etwas geladen wurde. */
export function loadDotEnv(path = ".env") {
  // Node >= 20.12 hat einen eingebauten Parser mit --env-file-Semantik.
  if (typeof process.loadEnvFile === "function") {
    try { process.loadEnvFile(path); return true; } catch (e) { return false; }
  }
  // Fallback: Mini-Parser (KEY=VALUE, #-Kommentare, optionale Quotes).
  let txt;
  try { txt = readFileSync(path, "utf8"); } catch (e) { return false; }
  for (const line of txt.split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
  return true;
}
