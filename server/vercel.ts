// server/vercel.ts — Vercel entry (web handler signature). Vercel serves static
// files from public/ itself; everything else goes through the same ROUTES table.
// Storage: redis-rest (Upstash) — Vercel functions have no persistent disk.
import { handleRequest } from "./routes.ts";
import { createRedisRestKv } from "./kv-redis-rest.ts";
import type { KitEnv } from "../functions/_lib/types.ts";

const env: KitEnv = { ...process.env } as KitEnv;
if (!env.KIT_KV && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  env.KIT_KV = createRedisRestKv(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN);
}

export default async function handler(request: Request): Promise<Response> {
  const response = await handleRequest(request, env);
  return response ?? new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}
