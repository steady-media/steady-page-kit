// _lib/auth.ts — authorizer seam. v2.0: shared admin code, timing-safe.
// v2.1 (planned, spec §2.6): swap for a "Login with Steady" owner check —
// ONLY this function gets replaced, the callers stay.
import type { KitEnv } from "./types.ts";

/** true if the request may perform global writes (config/logo). */
export async function isAuthorized(request: Request, env: KitEnv): Promise<boolean> {
  const code = env.KIT_ADMIN_CODE;
  const given = request.headers.get("x-kit-admin") || "";
  if (!code || !given) return false;
  // Digest comparison instead of ===: constant time regardless of match length.
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(code)),
  ]);
  const va = new Uint8Array(a), vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i]! ^ vb[i]!;
  return diff === 0;
}
