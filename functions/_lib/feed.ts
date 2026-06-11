// _lib/feed.ts — Steady-RSS holen und in Items parsen.
// Der Feed ist das CMS; gerendert wird live mit 10 Minuten Edge-Cache.

import type { FeedItem } from "./types.ts";
import { FEED_URL, MAX_PILLS, USER_AGENT } from "./config.ts";

// In-Memory-Cache (10 Min) pro Feed-URL. Auf Node ist das DER Cache; auf Cloudflare
// liegt er zusätzlich vor dem Edge-Cache (cf-Option unten) — bewusst doppelt, nicht
// „reparieren". Bei Fetch-Fehlern servieren wir lieber den letzten Stand als gar nichts.
const FEED_TTL_MS = 10 * 60 * 1000;
const FEED_TIMEOUT_MS = 10_000;
const feedCache = new Map<string, { xml: string; at: number }>(); // url → { xml, at }

/** Cache leeren — nur für Tests. */
export function _resetFeedCache(): void { feedCache.clear(); }

/** Feed-XML laden (10 Min gecacht; cf-Option wird außerhalb Cloudflares ignoriert). */
export async function fetchFeedXml(feedUrl?: string | null, opts: { timeoutMs?: number } = {}): Promise<string> {
  const url = feedUrl || FEED_URL;
  if (!url) throw new Error("feed URL missing — kit.config.js ist noch nicht konfiguriert");
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
    if (feedCache.size > 8) feedCache.clear(); // mehr als public+fulltext gibt es nicht — Schutzkappe
    feedCache.set(url, { xml, at: Date.now() });
    return xml;
  } catch (err) {
    if (hit) return hit.xml; // abgelaufen, aber besser als Fehlerseite
    throw err;
  }
}

/**
 * Feed laden und parsen. Ohne Argument den öffentlichen Feed (Teaser aller Posts),
 * mit `feedUrl` z. B. den authentifizierten Volltext-Feed.
 * @returns {Promise<Array<FeedItem>>}
 */
export async function getItems(feedUrl?: string | null): Promise<FeedItem[]> {
  return parseFeed(await fetchFeedXml(feedUrl));
}

/** Channel-Metadaten (Titel/Beschreibung der Publikation) aus bereits geladenem XML. */
export function parseChannelMeta(xml: string): { title: string; description: string } {
  const head = xml.split(/<item\b/)[0]; // nur der Channel-Kopf vor dem ersten Item
  return { title: tag(head, "title"), description: tag(head, "description") };
}

/**
 * RSS-XML → Item-Liste.
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
      image:       media ? media[1].replace(/&amp;/g, "&") : "", // XML-Attribut → echte URL
      link:        tag(b, "link"),
      guid:        tag(b, "guid"),
      pubDate:     tag(b, "pubDate"),
      content:     ce ? stripCdata(ce[1]) : "", // nur im Volltext-Feed gefüllt
    });
  }
  return items;
}

/**
 * Titel normalisieren — Join-Schlüssel zwischen öffentlichem und Volltext-Feed
 * (die Guids beider Feeds unterscheiden sich, die Titel stimmen überein).
 */
export function normTitle(s: string): string {
  return String(s || "").toLowerCase().replace(/&[a-z]+;/g, " ").replace(/[^a-z0-9äöüß]+/g, " ").trim();
}

/** Häufigste Kategorien (für Pills, Rubriken, Themen-Leiste), absteigend nach Anzahl. */
export function topCategories(items: FeedItem[]): string[] {
  const counts = new Map<string, number>();
  for (const it of items) for (const c of it.categories) {
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PILLS).map(e => e[0]);
}

/* — private XML-Helfer — */

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
