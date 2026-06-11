// _lib/http.ts — Response-Helfer für die /api/*-Endpunkte.

/** HTML-Antwort mit Cache-Header (siehe buildPageContext) + Security-Baseline.
 *  (public/_headers greift nur für statische Assets, nicht für Function-Antworten.) */
export function htmlResponse(html: string, cacheControl?: string, status: number = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": cacheControl || "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "SAMEORIGIN",
    },
  });
}

/** JSON-Antwort; API-Antworten sind standardmäßig uncached. */
export function jsonResponse(obj: unknown, status: number = 200, cacheControl: string = "no-store"): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
    },
  });
}

