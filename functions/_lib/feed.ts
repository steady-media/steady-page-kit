// _lib/feed.ts — fetch the Steady RSS and parse it into items.
// The feed is the CMS; rendered live with a 10-minute edge cache.

import type { FeedItem } from "./types.ts";
import { FEED_URL, MAX_PILLS, USER_AGENT } from "./config.ts";

// In-memory cache (10 min) per feed URL. On Node this IS the cache; on Cloudflare
// it sits in front of the edge cache too (cf option below) — deliberately doubled,
// don't "fix" it. On fetch errors we'd rather serve the last state than nothing.
const FEED_TTL_MS = 10 * 60 * 1000;
const FEED_TIMEOUT_MS = 10_000;
const feedCache = new Map<string, { xml: string; at: number }>(); // url → { xml, at }

/** Clear the cache — tests only. */
export function _resetFeedCache(): void { feedCache.clear(); }

/** Load feed XML (cached 10 min; the cf option is ignored outside Cloudflare). */
export async function fetchFeedXml(feedUrl?: string | null, opts: { timeoutMs?: number } = {}): Promise<string> {
  const url = feedUrl || FEED_URL;
  if (!url) throw new Error("feed URL missing — kit.config.js is not configured yet");
  const hit = feedCache.get(url);
  if (hit && Date.now() - hit.at < FEED_TTL_MS) return hit.xml;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(opts.timeoutMs ?? FEED_TIMEOUT_MS),
      cf: { cacheTtl: 600, cacheEverything: true },
    } as RequestInit);
    if (!res.ok) throw new Error("feed HTTP " + res.status);
    const xml = await res.text();
    if (feedCache.size > 8) feedCache.clear(); // never more than public+fulltext — safety cap
    feedCache.set(url, { xml, at: Date.now() });
    return xml;
  } catch (err) {
    if (hit) return hit.xml; // stale, but better than an error page
    throw err;
  }
}

/**
 * Load and parse the feed. Without an argument the public feed (teasers of all
 * posts); with `feedUrl` e.g. the authenticated full-text feed.
 * @returns {Promise<Array<FeedItem>>}
 */
export async function getItems(feedUrl?: string | null): Promise<FeedItem[]> {
  return parseFeed(await fetchFeedXml(feedUrl));
}

/** Channel metadata (publication title/description) from already-loaded XML. */
export function parseChannelMeta(xml: string): { title: string; description: string } {
  const head = xml.split(/<item\b/)[0]; // only the channel head before the first item
  return { title: tag(head, "title"), description: tag(head, "description") };
}

/**
 * RSS XML → item list.
 * @typedef {{title:string, description:string, categories:string[], image:string,
 *            link:string, guid:string, pubDate:string, content:string}} FeedItem
 */
export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const media = b.match(/<media:content\b[^>]*\burl="([^"]+)"/);
    const ce = b.match(/<content:encoded\b[^>]*>([\s\S]*?)<\/content:encoded>/);
    items.push({
      title:       tag(b, "title"),
      description: tag(b, "description"),
      categories:  allTags(b, "category"),
      image:       media ? media[1].replace(/&amp;/g, "&") : "", // XML attribute → real URL
      link:        tag(b, "link"),
      guid:        tag(b, "guid"),
      pubDate:     tag(b, "pubDate"),
      content:     ce ? stripCdata(ce[1]) : "", // only populated in the full-text feed
    });
  }
  return items;
}

/**
 * Normalize a title — the join key between the public and full-text feeds
 * (the GUIDs of the two feeds differ, the titles match).
 */
export function normTitle(s: string): string {
  return String(s || "").toLowerCase().replace(/&[a-z]+;/g, " ").replace(/[^a-z0-9äöüß]+/g, " ").trim();
}

/** Most frequent categories (for pills, sections, topics rail), descending by count. */
export function topCategories(items: FeedItem[]): string[] {
  const counts = new Map<string, number>();
  for (const it of items) for (const c of it.categories) {
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PILLS).map(e => e[0]);
}

/* — private XML helpers — */

function stripCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}
function tag(block: string, name: string): string {
  const m = block.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">"));
  return m ? stripCdata(m[1]) : "";
}
function allTags(block: string, name: string): string[] {
  const re = new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">", "g");
  const out: string[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push(stripCdata(m[1]));
  return out;
}
