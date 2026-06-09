// Route: GET /memberships → Steady-Checkout-Embed (insert_steady_checkout_here)
// Die Steady-Backend-Checkout-URL zeigt auf neu.blaupause.community/memberships;
// das Widget rendert die Mitgliedschaftspakete in den Container.
import { renderMemberships, parseStruct, getLogoMeta } from "./_shared.js";

export async function onRequestGet(context) {
  const cookie = context.request.headers.get("cookie") || "";
  const cfg = parseStruct(cookie);
  cfg.logo = await getLogoMeta(context.env);
  const hasCfg = /(?:^|;\s*)kit(?:struct|chrome)=/.test(cookie);
  return new Response(renderMemberships(cfg), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": hasCfg ? "no-store" : "public, max-age=300",
    },
  });
}
