// test/routes-gaps.test.js — Coverage-Lücken aus dem Eng-Review (2026-06-11).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../server/node.ts";
import { _resetFeedCache } from "../functions/_lib/feed.ts";
import { MEMBER_HEADING } from "../functions/_lib/config.ts"; // fork-sicher: echte Überschrift

const FEED_XML = `<?xml version="1.0"?><rss><channel>
<title>Gap-Tests</title><description><![CDATA[x]]></description>
<item><title><![CDATA[Mitglieder-Post]]></title><description><![CDATA[Teaser.]]></description>
<category>politik</category><guid>guid-gap-001</guid>
<pubDate>Mon, 17 Mar 2025 08:00:00 +0000</pubDate></item>
</channel></rss>`;

const FULL_XML = FEED_XML.replace("<description><![CDATA[Teaser.]]></description>",
  `<description><![CDATA[Teaser.]]></description><content:encoded><![CDATA[
   <p>Öffentlicher Teil.</p><h2>${MEMBER_HEADING}</h2><p>Geheimer Teil.</p>]]></content:encoded>`);

let feedSrv, kitSrv, base, dataDir;
before(async () => {
  _resetFeedCache();
  feedSrv = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/rss+xml" });
    res.end(req.url.startsWith("/full") ? FULL_XML : FEED_XML);
  });
  await new Promise(r => feedSrv.listen(0, "127.0.0.1", r));
  const fu = `http://127.0.0.1:${feedSrv.address().port}`;
  dataDir = await mkdtemp(join(tmpdir(), "kitgaps-"));
  kitSrv = await startServer({ port: 0, env: {
    FEED_URL: fu + "/rss", FULLTEXT_FEED_URL: fu + "/full",
    KIT_ADMIN_CODE: "geheim-1234567890", KIT_DATA_DIR: dataDir,
    SITE_ORIGIN: "https://gap.test",
  }});
  base = `http://127.0.0.1:${kitSrv.address().port}`;
});
after(async () => {
  await new Promise(r => kitSrv.close(r));
  await new Promise(r => feedSrv.close(r));
  await rm(dataDir, { recursive: true, force: true });
  _resetFeedCache();
});

test("GET /memberships rendert den Checkout-Container", async () => {
  const res = await fetch(base + "/memberships");
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes("insert_steady_checkout_here"));
});

test("GET /robots.txt nutzt SITE_ORIGIN", async () => {
  const res = await fetch(base + "/robots.txt");
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "User-agent: *\nAllow: /\n\nSitemap: https://gap.test/sitemap.xml\n");
});

test("Unbekannter Pfad → 404", async () => {
  const res = await fetch(base + "/gibt-es-nicht");
  assert.equal(res.status, 404);
});

test("Trailing Slash → 301 auf slashlose URL, Query bleibt", async () => {
  const res = await fetch(base + "/memberships/?x=1", { redirect: "manual" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/memberships?x=1");
});

test("config: PATCH ohne Vorversion → 404; PUT+PATCH = Revert; Doppel-PATCH = Redo; DELETE = Reset", async () => {
  const H = { "x-kit-admin": "geheim-1234567890", "content-type": "application/json" };
  assert.equal((await fetch(base + "/api/config", { method: "PATCH", headers: H })).status, 404);
  await fetch(base + "/api/config", { method: "PUT", headers: H, body: JSON.stringify({ skin: { v: "1" } }) });
  await fetch(base + "/api/config", { method: "PUT", headers: H, body: JSON.stringify({ skin: { v: "2" } }) });
  assert.equal((await fetch(base + "/api/config", { method: "PATCH", headers: H })).status, 200);
  assert.equal((await (await fetch(base + "/api/config")).json()).skin.v, "1"); // Revert
  await fetch(base + "/api/config", { method: "PATCH", headers: H });
  assert.equal((await (await fetch(base + "/api/config")).json()).skin.v, "2"); // Redo
  assert.equal((await fetch(base + "/api/config", { method: "DELETE", headers: H })).status, 200);
  assert.deepEqual(await (await fetch(base + "/api/config")).json(), {});      // Reset
});

test("logo: über 1,5 MB → 413 too_large (Handler-Limit)", async () => {
  const res = await fetch(base + "/api/logo", {
    method: "PUT",
    headers: { "x-kit-admin": "geheim-1234567890", "x-kit-type": "image/png" },
    body: new Uint8Array(1572865),
  });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error, "too_large");
});

test("Paywall-Cut: Volltext enthält steady_paywall vor dem Mitglieder-Teil", async () => {
  const res = await fetch(base + "/posts/guid-gap-001");
  assert.equal(res.status, 200);
  const html = await res.text();
  const cut = html.indexOf('id="steady_paywall"');
  assert.ok(cut > 0, "Paywall-Element fehlt");
  assert.ok(html.indexOf("Geheimer Teil") > cut, "Mitglieder-Inhalt steht vor der Paywall");
});

test("Feed down + kalter Cache: / fällt freundlich zurück, /rss → 503 mit retry-after", async () => {
  _resetFeedCache();
  const deadDir = await mkdtemp(join(tmpdir(), "kitdead-"));
  const dead = await startServer({ port: 0, env: {
    FEED_URL: "http://127.0.0.1:9/rss", KIT_DATA_DIR: deadDir, SITE_ORIGIN: "https://gap.test",
  }});
  const dbase = `http://127.0.0.1:${dead.address().port}`;
  try {
    const landing = await fetch(dbase + "/");
    assert.equal(landing.status, 200); // renderEmpty — freundlicher Fallback, kein 500
    const rss = await fetch(dbase + "/rss");
    assert.equal(rss.status, 503);
    assert.equal(rss.headers.get("retry-after"), "120");
  } finally {
    await new Promise(r => dead.close(r));
    await rm(deadDir, { recursive: true, force: true });
    _resetFeedCache();
  }
});
