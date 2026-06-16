// _lib/http.ts — response helpers for the /api/* endpoints.

/** HTML response with cache header (see buildPageContext) + security baseline.
 *  (public/_headers only applies to static assets, not to function responses.) */
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

/** JSON response; API responses are uncached by default. */
export function jsonResponse(obj: unknown, status: number = 200, cacheControl: string = "no-store"): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
    },
  });
}

