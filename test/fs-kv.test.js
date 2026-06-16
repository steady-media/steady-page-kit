// test/fs-kv.test.js — filesystem KV shim (Node path): must behave exactly like the
// subset of the Cloudflare KV API we use (get text/json/arrayBuffer in both
// signatures, put string/ArrayBuffer, delete idempotent).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFsKv } from "../server/fs-kv.ts";

async function freshKv(t) {
  const dir = await mkdtemp(join(tmpdir(), "kitkv-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { kv: createFsKv(dir), dir };
}

test("fs-kv: text/json roundtrip, both get signatures (string + {type, cacheTtl})", async t => {
  const { kv } = await freshKv(t);
  await kv.put("config", JSON.stringify({ a: 1 }));
  assert.equal(await kv.get("config"), '{"a":1}');
  assert.deepEqual(await kv.get("config", "json"), { a: 1 });
  assert.deepEqual(await kv.get("config", { type: "json", cacheTtl: 60 }), { a: 1 });
});

test("fs-kv: arrayBuffer roundtrip with binary bytes (logo path)", async t => {
  const { kv } = await freshKv(t);
  const bytes = new Uint8Array([0, 255, 1, 2, 128, 7]);
  await kv.put("logo:data", bytes.buffer);
  const ab = await kv.get("logo:data", "arrayBuffer");
  assert.ok(ab instanceof ArrayBuffer);
  assert.deepEqual(new Uint8Array(ab), bytes);
});

test("fs-kv: missing key → null, broken JSON → null, delete idempotent", async t => {
  const { kv } = await freshKv(t);
  assert.equal(await kv.get("nope"), null);
  assert.equal(await kv.get("nope", "json"), null);
  await kv.put("bad", "{not json");
  assert.equal(await kv.get("bad", "json"), null);
  await kv.delete("nope"); // must not throw
  await kv.put("x", "1");
  await kv.delete("x");
  assert.equal(await kv.get("x"), null);
});

test("fs-kv: ':' keys (config:prev, react:<guid>) and traversal keys stay in the directory", async t => {
  const { kv, dir } = await freshKv(t);
  await kv.put("config:prev", "alt");
  await kv.put("react:abc-123", "3");
  await kv.put("../escape", "x");
  assert.equal(await kv.get("config:prev"), "alt");
  assert.equal(await kv.get("react:abc-123"), "3");
  assert.equal(await kv.get("../escape"), "x");
  // all as flat files IN THE DIRECTORY — "../" is encoded to "..%2F",
  // i.e. no path separator in the filename, no escape possible.
  const files = await readdir(dir);
  assert.equal(files.length, 3);
  assert.ok(files.every(f => !f.includes("/") && f !== ".." && f !== "."));
  assert.ok(files.includes("..%2Fescape"));
});
