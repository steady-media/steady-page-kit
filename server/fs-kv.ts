// server/fs-kv.ts — Dateisystem-Shim für die genutzte Teilmenge der Cloudflare-KV-API.
//
// Die Functions sprechen env.KIT_KV nur mit get/put/delete an (Typen: text, json,
// arrayBuffer). Auf Node liegt dahinter ein flaches Verzeichnis: ein Key = eine Datei,
// Dateiname = encodeURIComponent(Key) — das macht ":"-Keys (config:prev, react:<guid>)
// und Traversal-Versuche ("../x") gleichermaßen harmlos, weil "/" nie im Namen landet.
//
// Grenzen (dokumentiert in docs/agent/deploy/*): kein Multi-Replica-Betrieb, und der
// Host braucht eine persistente Disk, sonst sind Publish/Logo/Claps nach Redeploy weg.

import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { KVAdapter } from "../functions/_lib/types.ts";

/** KV-kompatibles Objekt über einem Datenverzeichnis. */
export function createFsKv(dir: string): KVAdapter {
  const fileOf = (key: string) => join(dir, encodeURIComponent(String(key)));

  return {
    async get(key: string, opts?: "text" | "json" | "arrayBuffer" | { type?: "text" | "json" | "arrayBuffer"; cacheTtl?: number }): Promise<unknown> {
      const type = typeof opts === "string" ? opts : (opts && opts.type) || "text";
      let buf: Buffer;
      try { buf = await readFile(fileOf(key)); } catch { return null; }
      if (type === "arrayBuffer") {
        // Slice statt buf.buffer: Node-Buffer teilen sich einen Pool — byteOffset beachten.
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
      // Atomar schreiben (tmp + rename): ein abgebrochener Logo-Upload darf keine
      // halbe Datei hinterlassen.
      const target = fileOf(key);
      const tmp = `${target}.tmp-${process.pid}-${Date.now().toString(36)}`;
      await writeFile(tmp, data);
      await rename(tmp, target);
    },

    async delete(key: string): Promise<void> {
      try { await unlink(fileOf(key)); } catch { /* fehlte schon → ok */ }
    },
  };
}
