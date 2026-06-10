// test/fs-kv.test.js — Dateisystem-KV-Shim (Node-Pfad): muss sich exakt wie die
// genutzte Teilmenge der Cloudflare-KV-API verhalten (get text/json/arrayBuffer
// in beiden Signaturen, put string/ArrayBuffer, delete idempotent).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFsKv } from "../server/fs-kv.js";

async function freshKv(t) {
  const dir = await mkdtemp(join(tmpdir(), "kitkv-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { kv: createFsKv(dir), dir };
}

test("fs-kv: text/json Roundtrip, beide get-Signaturen (string + {type, cacheTtl})", async t => {
  const { kv } = await freshKv(t);
  await kv.put("config", JSON.stringify({ a: 1 }));
  assert.equal(await kv.get("config"), '{"a":1}');
  assert.deepEqual(await kv.get("config", "json"), { a: 1 });
  assert.deepEqual(await kv.get("config", { type: "json", cacheTtl: 60 }), { a: 1 });
});

test("fs-kv: arrayBuffer Roundtrip mit Binärbytes (Logo-Pfad)", async t => {
  const { kv } = await freshKv(t);
  const bytes = new Uint8Array([0, 255, 1, 2, 128, 7]);
  await kv.put("logo:data", bytes.buffer);
  const ab = await kv.get("logo:data", "arrayBuffer");
  assert.ok(ab instanceof ArrayBuffer);
  assert.deepEqual(new Uint8Array(ab), bytes);
});

test("fs-kv: fehlender Key → null, kaputtes JSON → null, delete idempotent", async t => {
  const { kv } = await freshKv(t);
  assert.equal(await kv.get("nope"), null);
  assert.equal(await kv.get("nope", "json"), null);
  await kv.put("bad", "{kein json");
  assert.equal(await kv.get("bad", "json"), null);
  await kv.delete("nope"); // darf nicht werfen
  await kv.put("x", "1");
  await kv.delete("x");
  assert.equal(await kv.get("x"), null);
});

test("fs-kv: ':'-Keys (config:prev, react:<guid>) und Traversal-Keys bleiben im Verzeichnis", async t => {
  const { kv, dir } = await freshKv(t);
  await kv.put("config:prev", "alt");
  await kv.put("react:abc-123", "3");
  await kv.put("../escape", "x");
  assert.equal(await kv.get("config:prev"), "alt");
  assert.equal(await kv.get("react:abc-123"), "3");
  assert.equal(await kv.get("../escape"), "x");
  // alles als flache Dateien IM VerzeichNIS — "../" wird zu "..%2F" encodiert,
  // d. h. kein Pfadseparator im Dateinamen, kein Ausbruch möglich.
  const files = await readdir(dir);
  assert.equal(files.length, 3);
  assert.ok(files.every(f => !f.includes("/") && f !== ".." && f !== "."));
  assert.ok(files.includes("..%2Fescape"));
});
