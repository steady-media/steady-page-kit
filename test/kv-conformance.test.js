// test/kv-conformance.test.js — every storage backend satisfies the same
// KV subset, incl. the logo contract (1.5 MB binary roundtrip).
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFsKv } from "../server/fs-kv.ts";
import { createRedisRestKv } from "../server/kv-redis-rest.ts";

const LOGO_BYTES = 1572864; // exactly the /api/logo limit

function conformance(name, makeKv) {
  describe(`KVAdapter conformance: ${name}`, () => {
    let kv;
    before(async () => { kv = await makeKv(); });

    test("text: get/put/delete roundtrip, missing key → null", async () => {
      assert.equal(await kv.get("c:none"), null);
      await kv.put("c:txt", "hallo");
      assert.equal(await kv.get("c:txt"), "hallo");
      await kv.delete("c:txt");
      assert.equal(await kv.get("c:txt"), null);
    });

    test("json: object roundtrip + broken JSON → null", async () => {
      await kv.put("c:json", JSON.stringify({ a: 1, s: "ü" }));
      assert.deepEqual(await kv.get("c:json", "json"), { a: 1, s: "ü" });
      await kv.put("c:bad", "{nope");
      assert.equal(await kv.get("c:bad", "json"), null);
    });

    test("opts object form like settings.ts: {type:'json', cacheTtl}", async () => {
      await kv.put("c:opts", JSON.stringify({ ok: true }));
      assert.deepEqual(await kv.get("c:opts", { type: "json", cacheTtl: 60 }), { ok: true });
    });

    test("arrayBuffer: 1.5 MB binary roundtrip (logo contract)", async () => {
      const buf = new Uint8Array(LOGO_BYTES);
      for (let i = 0; i < buf.length; i += 4096) buf[i] = i % 251;
      await kv.put("c:logo", buf);
      const back = new Uint8Array(await kv.get("c:logo", "arrayBuffer"));
      assert.equal(back.byteLength, LOGO_BYTES);
      assert.equal(back[4096], 4096 % 251);
      assert.equal(back[LOGO_BYTES - 4096], (LOGO_BYTES - 4096) % 251);
    });

    test("schema keys with a colon work", async () => {
      await kv.put("config:prev", "x");
      assert.equal(await kv.get("config:prev"), "x");
      await kv.put("react:guid-eins-001", "7");
      assert.equal(await kv.get("react:guid-eins-001"), "7");
    });
  });
}

// — fs backend —
let fsDir;
before(async () => { fsDir = await mkdtemp(join(tmpdir(), "kvconf-")); });
after(async () => { await rm(fsDir, { recursive: true, force: true }); });
conformance("fs", async () => createFsKv(fsDir));

// — redis-rest backend against a fake Upstash server (GET /get|/set|/del) —
let restSrv;
const store = new Map();
before(async () => {
  restSrv = http.createServer(async (req, res) => {
    const [, op, rawKey] = req.url.split("/");
    const key = decodeURIComponent(rawKey || "");
    if (req.headers.authorization !== "Bearer test-token") { res.writeHead(401); return res.end("{}"); }
    const reply = obj => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    if (op === "get") return reply({ result: store.has(key) ? store.get(key) : null });
    if (op === "del") { store.delete(key); return reply({ result: 1 }); }
    if (op === "set") {
      const chunks = []; for await (const c of req) chunks.push(c);
      store.set(key, Buffer.concat(chunks).toString("utf8"));
      return reply({ result: "OK" });
    }
    res.writeHead(404); res.end("{}");
  });
  await new Promise(r => restSrv.listen(0, "127.0.0.1", r));
});
after(async () => { await new Promise(r => restSrv.close(r)); });
conformance("redis-rest", async () =>
  createRedisRestKv(`http://127.0.0.1:${restSrv.address().port}`, "test-token"));
