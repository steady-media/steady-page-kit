// server/fs-kv.ts — filesystem shim for the subset of the Cloudflare KV API we use.
//
// The functions only call env.KIT_KV with get/put/delete (types: text, json,
// arrayBuffer). On Node a flat directory sits behind it: one key = one file,
// filename = encodeURIComponent(key) — which makes ":" keys (config:prev, react:<guid>)
// and traversal attempts ("../x") equally harmless, because "/" never lands in the name.
//
// Limits (documented in docs/agent/deploy/*): no multi-replica operation, and the
// host needs a persistent disk, otherwise publish/logo/claps are gone after redeploy.

import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { KVAdapter } from "../functions/_lib/types.ts";

/** KV-compatible object over a data directory. */
export function createFsKv(dir: string): KVAdapter {
  const fileOf = (key: string) => join(dir, encodeURIComponent(String(key)));

  return {
    async get(key: string, opts?: "text" | "json" | "arrayBuffer" | { type?: "text" | "json" | "arrayBuffer"; cacheTtl?: number }): Promise<unknown> {
      const type = typeof opts === "string" ? opts : (opts && opts.type) || "text";
      let buf: Buffer;
      try { buf = await readFile(fileOf(key)); } catch { return null; }
      if (type === "arrayBuffer") {
        // slice instead of buf.buffer: Node buffers share a pool — mind the byteOffset.
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      }
      const text = buf.toString("utf8");
      if (type === "json") {
        try { return JSON.parse(text); } catch { return null; }
      }
      return text;
    },

    async put(key: string, value: string | ArrayBuffer | ArrayBufferView, _options?: { expirationTtl?: number }): Promise<void> {
      await mkdir(dir, { recursive: true });
      const data = typeof value === "string" ? Buffer.from(value, "utf8")
        : Buffer.isBuffer(value) ? value
        : ArrayBuffer.isView(value) ? Buffer.from(value.buffer as ArrayBuffer, value.byteOffset, value.byteLength)
        : Buffer.from(value as ArrayBuffer); // ArrayBuffer
      // Atomic write (tmp + rename): an aborted logo upload must not leave a
      // half-written file behind.
      const target = fileOf(key);
      const tmp = `${target}.tmp-${process.pid}-${Date.now().toString(36)}`;
      await writeFile(tmp, data);
      await rename(tmp, target);
    },

    async delete(key: string): Promise<void> {
      try { await unlink(fileOf(key)); } catch { /* already missing → ok */ }
    },
  };
}
