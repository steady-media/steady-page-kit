// Route: GET /posts/:id → single post (":id" = feed GUID).
//
// Full text: the public feed carries teasers only. If the secret FULLTEXT_FEED_URL
// is set (authenticated Steady feed, ~6 newest posts with content:encoded), we join
// the full text onto the post by normalized title — the GUIDs of the two feeds
// differ, the titles match. The member section is gated at render time with the
// official Steady paywall element (see render.ts).
import type { KitContext, FeedItem } from "../_lib/types.ts";
import { getItems, normTitle } from "../_lib/feed.ts";
import { buildPageContext, getClaps, isConfigured } from "../_lib/settings.ts";
import { htmlResponse } from "../_lib/http.ts";
import { renderPost, render404, renderOnboarding } from "../_lib/render.ts";

export async function onRequestGet(context: KitContext): Promise<Response> {
  const id = context.params.id;
  const { cfg, cacheControl } = await buildPageContext(context);
  if (!isConfigured(cfg)) return htmlResponse(renderOnboarding(), "no-store");

  let items: FeedItem[] = [];
  try {
    items = await getItems(cfg.feedUrl);
  } catch (err) {
    items = [];
  }
  const idx = items.findIndex(i => i.guid === id);
  if (idx < 0) return htmlResponse(render404(cfg), cacheControl, 404);
  const item = items[idx];

  // Full text (best effort) + clap counter fetched in parallel
  const fulltextUrl = context.env && context.env.FULLTEXT_FEED_URL;
  const loadFull = async () => {
    if (!fulltextUrl) return "";
    try {
      const want = normTitle(item.title);
      const match = (await getItems(fulltextUrl)).find(i => normTitle(i.title) === want);
      return (match && match.content) || "";
    } catch (err) {
      return "";
    }
  };
  const [full, claps] = await Promise.all([loadFull(), getClaps(context.env, id)]);

  // Neighbor posts (feed is newest-first): next = newer, prev = older
  const extras = {
    claps,
    next: idx > 0 ? { guid: items[idx - 1].guid, title: items[idx - 1].title } : null,
    prev: idx < items.length - 1 ? { guid: items[idx + 1].guid, title: items[idx + 1].title } : null,
  };
  return htmlResponse(renderPost(item, cfg, full, extras), cacheControl);
}

// Treat HEAD like GET (crawlers/uptime checks); workerd strips the body itself.
export const onRequestHead = onRequestGet;
