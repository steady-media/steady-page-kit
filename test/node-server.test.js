// test/node-server.test.js — der portable Node-Server muss sich wie Cloudflare
// Pages verhalten: gleiche Routen, gleiche Handler, gleicher Admin-Gate.
// Der Feed kommt aus einem lokalen Fixture-Server (kein Netz im Test).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { checkNodeVersion } from "../server/node.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../server/node.ts";
import { _resetFeedCache } from "../functions/_lib/feed.ts";
import { IS_CONFIGURED } from "../functions/_lib/config.ts";

const FEED_XML = `<?xml version="1.0"?><rss><channel>
<title>Test-Publikation</title><description><![CDATA[Testfeed.]]></description>
<item>
  <title><![CDATA[Erster Beitrag]]></title>
  <description><![CDATA[Teaser eins.]]></description>
  <category>politik</category>
  <media:content url="https://img.example/1.jpg"/>
  <link>https://steady.page/p/1</link>
  <guid>guid-eins-001</guid>
  <pubDate>Mon, 17 Mar 2025 08:00:00 +0000</pubDate>
</item>
<item>
  <title><![CDATA[Zweiter Beitrag]]></title>
  <description><![CDATA[Teaser zwei.]]></description>
  <category>kultur</category>
  <guid>guid-zwei-002</guid>
  <pubDate>Tue, 18 Mar 2025 08:00:00 +0000</pubDate>
</item>
</channel></rss>`;

let feedSrv, feedUrl, kitSrv, base, dataDir;

before(async () => {
  _resetFeedCache();
  feedSrv = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/rss+xml" });
    res.end(FEED_XML);
  });
  await new Promise(r => feedSrv.listen(0, "127.0.0.1", r));
  feedUrl = `http://127.0.0.1:${feedSrv.address().port}/rss`;

  dataDir = await mkdtemp(join(tmpdir(), "kitdata-"));
  kitSrv = await startServer({
    port: 0,
    env: { FEED_URL: feedUrl, KIT_ADMIN_CODE: "geheim-123", KIT_DATA_DIR: dataDir, SITE_ORIGIN: "https://example.test" },
  });
  base = `http://127.0.0.1:${kitSrv.address().port}`;
});

after(async () => {
  await new Promise(r => kitSrv.close(r));
  await new Promise(r => feedSrv.close(r));
  await rm(dataDir, { recursive: true, force: true });
  _resetFeedCache();
});

test("GET / liefert die Landing mit Feed-Inhalten", async () => {
  const res = await fetch(base + "/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  assert.ok(html.includes("Erster Beitrag"));
});

test("HEAD / antwortet 200 ohne Body", async () => {
  const res = await fetch(base + "/", { method: "HEAD" });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "");
});

test("GET /posts/:id rendert den Post, unbekannte GUID → 404", async () => {
  const ok = await fetch(base + "/posts/guid-eins-001");
  assert.equal(ok.status, 200);
  assert.ok((await ok.text()).includes("Erster Beitrag"));
  const missing = await fetch(base + "/posts/gibt-es-nicht");
  assert.equal(missing.status, 404);
});

test("GET /rubrik/:slug filtert nach Kategorie", async () => {
  const res = await fetch(base + "/rubrik/politik");
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes("Erster Beitrag"));
});

test("GET /rss proxyt den Feed, /sitemap.xml nutzt SITE_ORIGIN-Env", async () => {
  const rss = await fetch(base + "/rss");
  assert.equal(rss.status, 200);
  assert.ok((await rss.text()).includes("Test-Publikation"));
  const map = await fetch(base + "/sitemap.xml");
  assert.equal(map.status, 200);
  assert.ok((await map.text()).includes("https://example.test/posts/guid-eins-001"));
});

test("/api/config: PUT ohne Admin-Code 401, mit Code 200, GET liefert das Gespeicherte", async () => {
  const noAuth = await fetch(base + "/api/config", { method: "PUT", body: "{}" });
  assert.equal(noAuth.status, 401);
  const put = await fetch(base + "/api/config", {
    method: "PUT",
    headers: { "x-kit-admin": "geheim-123", "content-type": "application/json" },
    body: JSON.stringify({ skin: { kitColorBrand: "#112233" }, kitstruct: "shell%3Dportal", kitchrome: "" }),
  });
  assert.equal(put.status, 200);
  const got = await (await fetch(base + "/api/config")).json();
  assert.equal(got.skin.kitColorBrand, "#112233");
});

test("/api/logo: Binär-Roundtrip mit Admin-Gate", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 1]);
  const put = await fetch(base + "/api/logo", {
    method: "PUT",
    headers: { "x-kit-admin": "geheim-123", "x-kit-type": "image/png", "x-kit-aspect": "2.5" },
    body: bytes,
  });
  assert.equal(put.status, 200);
  const get = await fetch(base + "/api/logo");
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("content-type"), "image/png");
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()), bytes);
});

test("/api/react zählt hoch (KV über fs-Shim)", async () => {
  const one = await (await fetch(base + "/api/react?g=guid-eins-001", { method: "POST" })).json();
  assert.equal(one.n, 1);
  const two = await (await fetch(base + "/api/react?g=guid-eins-001", { method: "POST" })).json();
  assert.equal(two.n, 2);
});

test("/api/search findet Feed-Items", async () => {
  const res = await (await fetch(base + "/api/search?q=zweiter")).json();
  assert.equal(res.results.length, 1);
  assert.equal(res.results[0].u, "/posts/guid-zwei-002");
});

test("Statics: kit.css mit Langzeit-Cache, _headers wird nie ausgeliefert", async () => {
  const css = await fetch(base + "/assets/kit.css");
  assert.equal(css.status, 200);
  assert.equal(css.headers.get("cache-control"), "public, max-age=604800");
  assert.match(css.headers.get("content-type"), /text\/css/);
  const blocked = await fetch(base + "/_headers");
  assert.equal(blocked.status, 404);
});

test("405 bei nicht unterstützter Methode, mit Allow-Header", async () => {
  const res = await fetch(base + "/rss", { method: "PUT", body: "x" });
  assert.equal(res.status, 405);
  assert.ok(res.headers.get("allow").includes("GET"));
});

test(
  "Onboarding-Modus: ohne Feed-Quelle zeigt / die Setup-Seite",
  // In gefüllten Publisher-Forks greift IS_CONFIGURED aus kit.config.js — den
  // unkonfigurierten Zustand gibt es dort nicht mehr.
  { skip: IS_CONFIGURED && "kit.config.js ist gefüllt (Fork)" },
  async t => {
  const dir = await mkdtemp(join(tmpdir(), "kitdata2-"));
  const srv = await startServer({ port: 0, env: { FEED_URL: "", KIT_DATA_DIR: dir } });
  t.after(async () => { await new Promise(r => srv.close(r)); await rm(dir, { recursive: true, force: true }); });
  const res = await fetch(`http://127.0.0.1:${srv.address().port}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("Richte meine Seite ein"));
  assert.ok(html.includes("Set up my page"));
});

test("Bootstrap: checkNodeVersion akzeptiert >=22.18, lehnt älter ab", () => {
  assert.equal(checkNodeVersion("22.18.0"), null);
  assert.equal(checkNodeVersion("24.1.0"), null);
  assert.match(checkNodeVersion("22.17.1") || "", /22\.18/);
  assert.match(checkNodeVersion("20.19.0") || "", /Node 24 LTS/);
});
