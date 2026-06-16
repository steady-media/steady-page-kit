// server/kv-redis-rest.ts — KVAdapter over the Upstash-compatible Redis REST API.
// For hosts without disk (Vercel). Only fetch, no dependencies. Binary values are
// marked + base64-encoded (REST transports strings). NOTE for deploy docs:
// Upstash Free caps requests at 1 MB — the 1.5 MB logo needs a paid tier;
// the conformance test enforces the contract against the fake.
import { Buffer } from "node:buffer";
import type { KVAdapter } from "../functions/_lib/types.ts";

const B64 = " b64:"; // marker; never occurs in any schema value

export function createRedisRestKv(baseUrl: string, token: string): KVAdapter {
  const url = baseUrl.replace(/\/+$/, "");
  const headers = { authorization: `Bearer ${token}` };

  async function call(path: string, body?: string): Promise<unknown> {
    const res = await fetch(url + path, body === undefined
      ? { headers }
      : { method: "POST", headers, body });
    if (!res.ok) throw new Error(`redis-rest HTTP ${res.status}`);
    const data = (await res.json()) as { result: unknown };
    return data.result;
  }

  return {
    async get(key, opts) {
      const type = typeof opts === "string" ? opts : ((opts as { type?: string } | undefined) && (opts as { type?: string }).type) || "text";
      const raw = (await call(`/get/${encodeURIComponent(key)}`)) as string | null;
      if (raw == null) return null;
      if (type === "arrayBuffer") {
        const b64 = raw.startsWith(B64) ? raw.slice(B64.length) : Buffer.from(raw, "utf8").toString("base64");
        const buf = Buffer.from(b64, "base64");
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      }
      const text = raw.startsWith(B64) ? Buffer.from(raw.slice(B64.length), "base64").toString("utf8") : raw;
      if (type === "json") { try { return JSON.parse(text); } catch { return null; } }
      return text;
    },
    async put(key, value) {
      const body = typeof value === "string"
        ? value
        : B64 + Buffer.from(ArrayBuffer.isView(value)
            ? new Uint8Array(value.buffer as ArrayBuffer, value.byteOffset, value.byteLength)
            : new Uint8Array(value as ArrayBuffer)).toString("base64");
      await call(`/set/${encodeURIComponent(key)}`, body);
    },
    async delete(key) {
      await call(`/del/${encodeURIComponent(key)}`);
    },
  };
}
