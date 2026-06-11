// _lib/auth.ts — Authorizer-Naht. v2.0: geteilter Admin-Code, timing-safe.
// v2.1 (geplant, Spec §2.6): Tausch gegen „Login mit Steady"-Owner-Check —
// NUR diese Funktion wird ersetzt, die Aufrufer bleiben.
import type { KitEnv } from "./types.ts";

/** true, wenn der Request globale Writes (Config/Logo) ausführen darf. */
export async function isAuthorized(request: Request, env: KitEnv): Promise<boolean> {
  const code = env.KIT_ADMIN_CODE;
  const given = request.headers.get("x-kit-admin") || "";
  if (!code || !given) return false;
  // Digest-Vergleich statt ===: konstante Zeit unabhängig von Übereinstimmungslänge.
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
