// test/feed-timeout.test.js — hanging feed: timeout instead of an endless hang,
// a warm cache bridges (stale-while-error becomes reachable via the timeout).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchFeedXml, _resetFeedCache } from "../functions/_lib/feed.ts";

let hangSrv, hangUrl, sockets;
before(async () => {
  sockets = new Set();
  hangSrv = http.createServer(() => { /* never respond */ });
  hangSrv.on("connection", s => sockets.add(s));
  await new Promise(r => hangSrv.listen(0, "127.0.0.1", r));
  hangUrl = `http://127.0.0.1:${hangSrv.address().port}/rss`;
});
after(async () => { for (const s of sockets) s.destroy(); await new Promise(r => hangSrv.close(r)); });

test("cold cache: a hanging feed aborts after timeoutMs", async () => {
  _resetFeedCache();
  const t0 = Date.now();
  await assert.rejects(() => fetchFeedXml(hangUrl, { timeoutMs: 200 }));
  assert.ok(Date.now() - t0 < 2000, "abort must happen promptly");
});

test("warm cache: a cached feed is served without network contact", async () => {
  _resetFeedCache();
  const okSrv = http.createServer((q, r) => { r.writeHead(200); r.end("<rss>ok</rss>"); });
  await new Promise(r => okSrv.listen(0, "127.0.0.1", r));
  const okUrl = `http://127.0.0.1:${okSrv.address().port}/rss`;
  assert.equal(await fetchFeedXml(okUrl), "<rss>ok</rss>");
  await new Promise(r => okSrv.close(r));
  // Server dead, cache warm (TTL 10 min) → cache serves directly, no hang.
  assert.equal(await fetchFeedXml(okUrl, { timeoutMs: 200 }), "<rss>ok</rss>");
});
