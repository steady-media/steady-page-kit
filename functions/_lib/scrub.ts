// _lib/scrub.ts — secret redaction for logs (AGENTS.md Hard Rule 1 as code).
// When adding new secrets (e.g. v2.1 OAuth client_secret): register them here.
import type { KitEnv } from "./types.ts";

export function scrubSecrets(text: string, env: Pick<KitEnv, "FULLTEXT_FEED_URL" | "TCHOP_TOKEN">): string {
  let out = text;
  const u = env.FULLTEXT_FEED_URL;
  if (u) {
    out = out.split(u).join("[redacted]");
    try {
      const q = new URL(u);
      if (q.search.length > 1) out = out.split(q.search.slice(1)).join("[redacted]");
    } catch { /* URL unparseable → the full-string replacement above already caught it */ }
  }
  // TCHOP_TOKEN — a bare bearer token (no URL structure), so a plain replacement suffices.
  const t = env.TCHOP_TOKEN;
  if (t) out = out.split(t).join("[redacted]");
  return out;
}

/** Central error logger — the only permitted console.error site for request errors. */
export function logError(err: unknown, env: Pick<KitEnv, "FULLTEXT_FEED_URL" | "TCHOP_TOKEN">): void {
  const base = err instanceof Error
    ? `${err.message}\n${err.stack ?? ""}${err.cause !== undefined ? `\ncause: ${String(err.cause)}` : ""}`
    : String(err);
  console.error("[steady-page-kit]", scrubSecrets(base, env));
}
