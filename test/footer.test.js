// test/footer.test.js — footer feature: site footer + kitchrome.foot parsing.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../server/node.ts";
import { _resetFeedCache } from "../functions/_lib/feed.ts";
import { parseStruct } from "../functions/_lib/settings.ts";

const FEED_XML = `<?xml version="1.0"?><rss><channel>
<title>Footer-Tests</title><description><![CDATA[x]]></description>
<item><title><![CDATA[Test-Beitrag]]></title><description><![CDATA[Teaser.]]></description>
<category>allgemein</category><guid>guid-footer-001</guid>
<pubDate>Mon, 17 Mar 2025 08:00:00 +0000</pubDate></item>
</channel></rss>`;

let feedSrv, kitSrv, base, dataDir;
before(async () => {
  _resetFeedCache();
  feedSrv = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/rss+xml" });
    res.end(FEED_XML);
  });
  await new Promise(r => feedSrv.listen(0, "127.0.0.1", r));
  const fu = `http://127.0.0.1:${feedSrv.address().port}`;
  dataDir = await mkdtemp(join(tmpdir(), "kitfoot-"));
  kitSrv = await startServer({ port: 0, env: {
    FEED_URL: fu + "/rss",
    KIT_ADMIN_CODE: "geheim-footer-test", KIT_DATA_DIR: dataDir,
  }});
  base = `http://127.0.0.1:${kitSrv.address().port}`;
});
after(async () => {
  await new Promise(r => kitSrv.close(r));
  await new Promise(r => feedSrv.close(r));
  await rm(dataDir, { recursive: true, force: true });
  _resetFeedCache();
});

test("GET / without a cookie → contains site-footer + brand block, no site-footer__links", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('class="site-footer"'), "site-footer missing");
  // Brand block: either logo img or brand__logo + brand__name
  assert.ok(
    html.includes('class="brand__logo"') || html.includes('class="brand__logo-img"'),
    "brand block missing in the footer"
  );
  assert.ok(!html.includes("site-footer__links"), "site-footer__links should be absent without a foot cookie");
});

test("GET / with a kitchrome foot cookie → footer contains an Impressum link with target=_blank", async () => {
  const chrome = JSON.stringify({ foot: [{ l: "Impressum", h: "https://example.org/impressum", x: true }] });
  const res = await fetch(base + "/", {
    headers: { "Cookie": "kitchrome=" + encodeURIComponent(chrome) },
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("site-footer__links"), "site-footer__links missing despite the foot cookie");
  assert.ok(html.includes("Impressum"), "Impressum label missing");
  assert.ok(html.includes("https://example.org/impressum"), "Impressum URL missing");
  assert.ok(html.includes('target="_blank"'), 'target="_blank" missing on the external link');
});

test("Footer shows only the icon — no wordmark, no uploaded logo (header shows the logo)", async () => {
  // upload the logo (admin-gated)
  const put = await fetch(base + "/api/logo", {
    method: "PUT",
    headers: { "x-kit-admin": "geheim-footer-test", "x-kit-type": "image/png", "x-kit-aspect": "3" },
    body: new Uint8Array([137, 80, 78, 71, 0, 1, 2, 3]),
  });
  assert.equal(put.status, 200);

  const html = await (await fetch(base + "/")).text();
  const cut = html.indexOf('class="site-footer"');
  assert.ok(cut > 0, "site-footer missing");
  const headerPart = html.slice(0, cut);
  const footerPart = html.slice(cut);

  // Header: uploaded logo
  assert.ok(headerPart.includes("brand__logo-img"), "header should show the uploaded logo");
  // Footer: ONLY the icon — no wordmark, no uploaded logo
  assert.ok(footerPart.includes('class="brand__logo"'), "footer should show the icon");
  assert.ok(!footerPart.includes('class="brand__name"'), "footer must NOT show a wordmark");
  assert.ok(!footerPart.includes("brand__logo-img"), "footer must NOT show the uploaded logo");

  // clean up so other tests don't see the logo
  await fetch(base + "/api/logo", { method: "DELETE", headers: { "x-kit-admin": "geheim-footer-test" } });
});

test("parseStruct unit: foot parsing — label limit 40 chars, max 8 entries", () => {
  const longLabel = "A".repeat(50);
  const entries = Array.from({ length: 10 }, (_, i) => ({ l: "Link " + i, h: "/link-" + i }));
  entries[0] = { l: longLabel, h: "/lang" };
  const chrome = JSON.stringify({ foot: entries });
  const s = parseStruct("kitchrome=" + encodeURIComponent(chrome));
  assert.ok(s.foot !== null, "foot should not be null");
  assert.equal(s.foot.length, 8, "foot should be capped at max 8 entries");
  assert.equal(s.foot[0].l.length, 40, "label should be capped at 40 chars");
});
