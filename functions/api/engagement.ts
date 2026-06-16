// Route: GET /api/engagement?key=<kanonische Steady-Post-URL>
//   → liest Kommentare + Reaktionen des passenden Tchop-Cards (read-only) und
//     liefert sie normalisiert (ohne PII) als JSON. Token NUR aus env.
// Nicht konfiguriert / kein Token → {configured:false, deepLink:<Fallback>}.
import type { KitContext } from "../_lib/types.ts";
import { jsonResponse } from "../_lib/http.ts";
import { effectiveEngagement } from "../_lib/config.ts";
import { getTchopClient } from "../_lib/tchop.ts";
import { logError } from "../_lib/scrub.ts";

// Kanonische Steady-Post-URL: https://steady.page/<pub>/posts/<uuid> — Pfadform erzwingen.
const KEY_RE = /^https:\/\/steady\.page\/[^\s"'<>/]{1,80}\/posts\/[^\s"'<>/]{8,80}$/i;

export async function onRequestGet(context: KitContext): Promise<Response> {
  const { request, env } = context;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!KEY_RE.test(key)) return jsonResponse({ error: "bad_key" }, 400);

  const cfg = effectiveEngagement(env);
  const fallback = cfg.appUrl || "https://apps.apple.com/de/app/steady-app/id6748311157";

  const client = getTchopClient(env, cfg);
  if (!client) return jsonResponse({ configured: false, deepLink: fallback }, 200, "public, max-age=300");

  try {
    const eng = await client.getEngagement(key);
    if (!eng) return jsonResponse({ configured: false, deepLink: fallback }, 200, "public, max-age=300");
    // Comments freier als HTML (5 Min) — eigener kurzer Cache.
    return jsonResponse({ configured: true, ...eng }, 200, "public, max-age=60");
  } catch (err) {
    // Fehlertolerant: nie die Seite blockieren, nie Secrets leaken.
    // Transiente Backend-Fehler nicht cachen (no-store).
    logError(err, env);
    return jsonResponse({ configured: false, deepLink: fallback }, 200, "no-store");
  }
}
