// server/env.js — .env-Loader (still tolerant; bestehende Env-Variablen gewinnen).
// Konsumenten: server/node.js (Bootstrap) und scripts/doctor.js.
/** .env laden; fehlende Datei ist ok. Liefert true, wenn geladen wurde. */
export function loadDotEnv(path = ".env") {
  try { process.loadEnvFile(path); return true; } catch { return false; }
}
