// test/feed.test.js — Feed-Parsing + Titel-Normalisierung (Join-Schlüssel der Volltexte).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeed, parseChannelMeta, normTitle, topCategories } from "../functions/_lib/feed.js";

const XML = `<?xml version="1.0"?><rss><channel>
<title>Beispiel-Publikation</title><description><![CDATA[Der Newsletter über Medien.]]></description>
<item>
  <title><![CDATA[Hallo Welt]]></title>
  <description><![CDATA[Ein Teaser.]]></description>
  <category>startup</category><category>wachsen</category>
  <media:content url="https://img.example/x.jpg"/>
  <link>https://steady.page/p/1</link>
  <guid>abc-123</guid>
  <pubDate>Mon, 17 Mar 2025 08:00:00 +0000</pubDate>
  <content:encoded><![CDATA[<p>Volltext</p>]]></content:encoded>
</item>
<item><title>Zweiter</title><category>startup</category><guid>def-456</guid></item>
</channel></rss>`;

test("parseFeed extrahiert alle Item-Felder", () => {
  const items = parseFeed(XML);
  assert.equal(items.length, 2);
  const it = items[0];
  assert.equal(it.title, "Hallo Welt");
  assert.equal(it.description, "Ein Teaser.");
  assert.deepEqual(it.categories, ["startup", "wachsen"]);
  assert.equal(it.image, "https://img.example/x.jpg");
  assert.equal(it.guid, "abc-123");
  assert.equal(it.content, "<p>Volltext</p>");
  assert.equal(items[1].content, ""); // ohne content:encoded → leer
});

test("parseChannelMeta liest den Channel-Kopf", () => {
  const meta = parseChannelMeta(XML);
  assert.equal(meta.title, "Beispiel-Publikation");
  assert.equal(meta.description, "Der Newsletter über Medien.");
});

test("normTitle normalisiert für den Volltext-Join", () => {
  assert.equal(normTitle("Du brauchst KEINE eigene App!"), "du brauchst keine eigene app");
  assert.equal(normTitle("Äpfel &amp; Birnen"), "äpfel birnen"); // Entities → Leerraum
  assert.equal(normTitle(""), "");
});

test("topCategories sortiert nach Häufigkeit", () => {
  const cats = topCategories(parseFeed(XML));
  assert.equal(cats[0], "startup"); // 2 Treffer vor 1 Treffer
  assert.ok(cats.includes("wachsen"));
});
