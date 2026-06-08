// Route: GET /memberships → Steady-Checkout-Embed (insert_steady_checkout_here)
// Die Steady-Backend-Checkout-URL zeigt auf neu.blaupause.community/memberships;
// das Widget rendert die Mitgliedschaftspakete in den Container.
import { renderMemberships } from "./_shared.js";

export async function onRequestGet() {
  return new Response(renderMemberships(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
