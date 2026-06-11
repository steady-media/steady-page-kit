// _lib/scrub.ts — Secret-Redaktion für Logs (AGENTS.md Hard Rule 1 als Code).
// Beim Ergänzen neuer Secrets (z. B. v2.1 OAuth client_secret): hier eintragen.
import type { KitEnv } from "./types.ts";

export function scrubSecrets(text: string, env: Pick<KitEnv, "FULLTEXT_FEED_URL">): string {
  let out = text;
  const u = env.FULLTEXT_FEED_URL;
  if (u) {
    out = out.split(u).join("[redacted]");
    try {
      const q = new URL(u);
      if (q.search.length > 1) out = out.split(q.search.slice(1)).join("[redacted]");
    } catch { /* URL unparsebar → der Voll-String-Ersatz oben hat gegriffen */ }
  }
  return out;
}

/** Zentraler Fehler-Logger — einzige erlaubte console.error-Stelle für Request-Fehler. */
export function logError(err: unknown, env: Pick<KitEnv, "FULLTEXT_FEED_URL">): void {
  const base = err instanceof Error
    ? `${err.message}\n${err.stack ?? ""}${err.cause !== undefined ? `\ncause: ${String(err.cause)}` : ""}`
    : String(err);
  console.error("[steady-page-kit]", scrubSecrets(base, env));
}
