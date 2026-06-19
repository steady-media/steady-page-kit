// Route: GET /api/engagement?key=<canonical Steady post URL>[&counts=1]
//   → reads the matching Tchop card's comments + reactions (read-only) and returns
//     them normalized (no PII) as JSON. The token is read from env ONLY.
//   counts=1 → counts only (commentCount + reactions), without the comment thread —
//   used by the lightweight teaser indicators on list pages.
// Not configured / no token → {configured:false, deepLink:<fallback>}.
import type { KitContext } from "../_lib/types.ts";
import { jsonResponse } from "../_lib/http.ts";
import { effectiveEngagement } from "../_lib/config.ts";
import { getTchopClient } from "../_lib/tchop.ts";
import { logError } from "../_lib/scrub.ts";

// Canonical Steady post URL: https://steady.page/<pub>/posts/<uuid> — enforce the path shape.
const KEY_RE = /^https:\/\/steady\.page\/[^\s"'<>/]{1,80}\/posts\/[^\s"'<>/]{8,80}$/i;

export async function onRequestGet(context: KitContext): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!KEY_RE.test(key)) return jsonResponse({ error: "bad_key" }, 400);
  const countsOnly = url.searchParams.get("counts") === "1";

  const cfg = effectiveEngagement(env);
  const fallback = cfg.appUrl || "https://apps.apple.com/de/app/steady-app/id6748311157";

  const client = getTchopClient(env, cfg);
  if (!client) return jsonResponse({ configured: false, deepLink: fallback }, 200, "public, max-age=300");

  try {
    const eng = await client.getEngagement(key);
    if (!eng) return jsonResponse({ configured: false, deepLink: fallback }, 200, "public, max-age=300");
    // Comments are fresher than the HTML (5 min) — gets its own short cache.
    const body = countsOnly
      ? { configured: true, hasCard: eng.hasCard, reactions: eng.reactions, commentCount: eng.commentCount, deepLink: eng.deepLink }
      : { configured: true, ...eng };
    return jsonResponse(body, 200, "public, max-age=60");
  } catch (err) {
    // Fault-tolerant: never block the page, never leak secrets. Don't cache a transient error.
    logError(err, env);
    return jsonResponse({ configured: false, deepLink: fallback }, 200, "no-store");
  }
}
