// Route: GET /memberships → Steady checkout embed.
// The Steady backend checkout URL points at this page; the Smart Layers widget
// renders the membership plans into the #insert_steady_checkout_here container.
import type { KitContext } from "./_lib/types.ts";
import { buildPageContext, isConfigured } from "./_lib/settings.ts";
import { htmlResponse } from "./_lib/http.ts";
import { renderMemberships, renderOnboarding } from "./_lib/render.ts";

export async function onRequestGet(context: KitContext): Promise<Response> {
  const { cfg, cacheControl } = await buildPageContext(context);
  if (!isConfigured(cfg)) return htmlResponse(renderOnboarding(), "no-store");
  return htmlResponse(renderMemberships(cfg), cacheControl);
}

// Treat HEAD like GET (crawlers/uptime checks); workerd strips the body itself.
export const onRequestHead = onRequestGet;
