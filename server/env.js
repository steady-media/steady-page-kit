// server/env.js — .env loader (silently tolerant; existing env variables win).
// Consumers: server/node.js (bootstrap) and scripts/doctor.js.
/** Load .env; a missing file is fine. Returns true when loaded. */
export function loadDotEnv(path = ".env") {
  try { process.loadEnvFile(path); return true; } catch { return false; }
}
