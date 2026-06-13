// test/footer.test.js — Footer-Feature: Site-Footer + kitchrome.foot-Parsing.
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

test("GET / ohne Cookie → enthält site-footer + Brand-Block, keine site-footer__links", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes('class="site-footer"'), "site-footer fehlt");
  // Brand-Block: entweder Logo-Img oder brand__logo + brand__name
  assert.ok(
    html.includes('class="brand__logo"') || html.includes('class="brand__logo-img"'),
    "Brand-Block fehlt im Footer"
  );
  assert.ok(!html.includes("site-footer__links"), "site-footer__links sollte ohne foot-Cookie fehlen");
});

test("GET / mit kitchrome foot-Cookie → Footer enthält Impressum-Link mit target=_blank", async () => {
  const chrome = JSON.stringify({ foot: [{ l: "Impressum", h: "https://example.org/impressum", x: true }] });
  const res = await fetch(base + "/", {
    headers: { "Cookie": "kitchrome=" + encodeURIComponent(chrome) },
  });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("site-footer__links"), "site-footer__links fehlt trotz foot-Cookie");
  assert.ok(html.includes("Impressum"), "Impressum-Label fehlt");
  assert.ok(html.includes("https://example.org/impressum"), "Impressum-URL fehlt");
  assert.ok(html.includes('target="_blank"'), 'target="_blank" fehlt bei externem Link');
});

test("Footer nutzt das Icon, auch wenn ein KV-Logo hochgeladen ist (Header zeigt das Logo)", async () => {
  // Logo hochladen (admin-gated)
  const put = await fetch(base + "/api/logo", {
    method: "PUT",
    headers: { "x-kit-admin": "geheim-footer-test", "x-kit-type": "image/png", "x-kit-aspect": "3" },
    body: new Uint8Array([137, 80, 78, 71, 0, 1, 2, 3]),
  });
  assert.equal(put.status, 200);

  const html = await (await fetch(base + "/")).text();
  const cut = html.indexOf('class="site-footer"');
  assert.ok(cut > 0, "site-footer fehlt");
  const headerPart = html.slice(0, cut);
  const footerPart = html.slice(cut);

  // Header: hochgeladenes Logo
  assert.ok(headerPart.includes("brand__logo-img"), "Header sollte das hochgeladene Logo zeigen");
  // Footer: Icon + Wortmarke, NICHT das Upload-Logo
  assert.ok(footerPart.includes('class="brand__logo"'), "Footer sollte das Icon zeigen");
  assert.ok(footerPart.includes('class="brand__name"'), "Footer sollte die Wortmarke zeigen");
  assert.ok(!footerPart.includes("brand__logo-img"), "Footer darf das Upload-Logo NICHT zeigen");

  // aufräumen, damit andere Tests das Logo nicht sehen
  await fetch(base + "/api/logo", { method: "DELETE", headers: { "x-kit-admin": "geheim-footer-test" } });
});

test("parseStruct-Unit: foot-Parsing — Label-Limit 40 Zeichen, max. 8 Einträge", () => {
  const longLabel = "A".repeat(50);
  const entries = Array.from({ length: 10 }, (_, i) => ({ l: "Link " + i, h: "/link-" + i }));
  entries[0] = { l: longLabel, h: "/lang" };
  const chrome = JSON.stringify({ foot: entries });
  const s = parseStruct("kitchrome=" + encodeURIComponent(chrome));
  assert.ok(s.foot !== null, "foot sollte nicht null sein");
  assert.equal(s.foot.length, 8, "foot sollte auf max. 8 Einträge gekappt sein");
  assert.equal(s.foot[0].l.length, 40, "Label sollte auf 40 Zeichen gekappt sein");
});
