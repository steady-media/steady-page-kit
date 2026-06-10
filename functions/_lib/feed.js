// _lib/feed.js — Steady-RSS holen und in Items parsen.
// Der Feed ist das CMS; gerendert wird live mit 10 Minuten Edge-Cache.

import { FEED_URL, MAX_PILLS } from "./config.js";

/** Feed-XML laden (Edge-Cache 10 Min). */
export async function fetchFeedXml(feedUrl) {
  const res = await fetch(feedUrl || FEED_URL, {
    headers: { "user-agent": "BlaupauseKit/1.0 (+cloudflare-pages)" },
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  if (!res.ok) throw new Error("feed HTTP " + res.status);
  return res.text();
}

/**
 * Feed laden und parsen. Ohne Argument den öffentlichen Feed (Teaser aller Posts),
 * mit `feedUrl` z. B. den authentifizierten Volltext-Feed.
 * @returns {Promise<Array<FeedItem>>}
 */
export async function getItems(feedUrl) {
  return parseFeed(await fetchFeedXml(feedUrl));
}

/** Channel-Metadaten (Titel/Beschreibung der Publikation) aus bereits geladenem XML. */
export function parseChannelMeta(xml) {
  const head = xml.split(/<item\b/)[0]; // nur der Channel-Kopf vor dem ersten Item
  return { title: tag(head, "title"), description: tag(head, "description") };
}

/**
 * RSS-XML → Item-Liste.
 * @typedef {{title:string, description:string, categories:string[], image:string,
 *            link:string, guid:string, pubDate:string, content:string}} FeedItem
 */
export function parseFeed(xml) {
  const items = [];
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
export function normTitle(s) {
  return String(s || "").toLowerCase().replace(/&[a-z]+;/g, " ").replace(/[^a-z0-9äöüß]+/g, " ").trim();
}

/** Häufigste Kategorien (für Pills, Rubriken, Themen-Leiste), absteigend nach Anzahl. */
export function topCategories(items) {
  const counts = new Map();
  for (const it of items) for (const c of it.categories) {
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PILLS).map(e => e[0]);
}

/* — private XML-Helfer — */

function stripCdata(s) {
  return s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}
function tag(block, name) {
  const m = block.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">"));
  return m ? stripCdata(m[1]) : "";
}
function allTags(block, name) {
  const re = new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">", "g");
  const out = []; let m;
  while ((m = re.exec(block))) out.push(stripCdata(m[1]));
  return out;
}
