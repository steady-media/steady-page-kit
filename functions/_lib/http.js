// _lib/http.js — Response-Helfer + Admin-Gate für die /api/*-Endpunkte.

/** HTML-Antwort mit Cache-Header (siehe buildPageContext in settings.js). */
export function htmlResponse(html, cacheControl, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": cacheControl || "no-store",
    },
  });
}

/** JSON-Antwort; API-Antworten sind standardmäßig uncached. */
export function jsonResponse(obj, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
    },
  });
}

/**
 * true, wenn der x-kit-admin-Header dem Secret KIT_ADMIN_CODE entspricht.
 * Das Panel ist öffentlich — alles, was global schreibt (Logo, Config),
 * MUSS durch dieses Gate.
 */
export function isAdmin(request, env) {
  const code = env && env.KIT_ADMIN_CODE;
  return !!code && (request.headers.get("x-kit-admin") || "") === code;
}
