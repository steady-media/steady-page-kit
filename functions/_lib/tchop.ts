// _lib/tchop.ts — Adapter für die Steady-App-Engagement-Quelle (Tchop).
// Eine Schnittstelle, zwei Backends (Stub + real). Der reale HTTP-Backend folgt
// in Phase 3, sobald ein read-scoped Token + Endpoint vorliegen — bis dahin liefert
// die Factory bei vorhandenem TCHOP_TOKEN noch null (Graceful Degradation).
import { cardDeepLink } from "./config.ts";
import type { EngagementCfg } from "./types.ts";

/** Normalisierter Kommentar — NUR unbedenkliche Felder (keine PII). */
export interface EngComment {
  id: number;
  author: { name: string; avatar: string | null };
  text: string;
  ts: string;
  highlighted: boolean;
  reactions: number;        // Summe aller Reaktionen
  replies: EngComment[];
}

/** Normalisiertes Engagement eines Posts. */
export interface Engagement {
  hasCard: boolean;         // false = Artikel (noch) nicht in der App gesynct
  deepLink: string;         // Per-Card- oder Fallback-Deeplink
  reactions: number;        // Summe aller Card-Reaktionen
  commentCount: number;
  comments: EngComment[];
}

export interface TchopClient {
  /** canonicalUrl = die Steady-Post-URL (RSS-<link>), Join-Key auf card.content.url. */
  getEngagement(canonicalUrl: string): Promise<Engagement | null>;
}

function sumReactions(rs: unknown): number {
  if (!Array.isArray(rs)) return 0;
  return rs.reduce((n, r) => n + (Number((r as { count?: unknown }).count) || 0), 0);
}

/**
 * Rohen Tchop-Kommentar auf den sicheren EngComment reduzieren. Verwirft bewusst
 * author.email/location/roleId/links (PII) — siehe Spec §14.5.
 * Rekursiv: auch verschachtelte Replies werden normalisiert.
 */
export function normalizeComment(raw: { [k: string]: unknown }, depth: number = 0): EngComment {
  const a = (raw.author || {}) as { [k: string]: unknown };
  const avatar = (a.avatar || {}) as { [k: string]: unknown };
  const replies = Array.isArray(raw.replies) ? raw.replies : [];
  return {
    id: Number(raw.id) || 0,
    author: {
      name: String(a.screenName || "").slice(0, 80),
      avatar: (avatar.thumb && /^https:\/\//i.test(String(avatar.thumb))) ? String(avatar.thumb) : null,
    },
    text: String(raw.content || ""),
    ts: String(raw.createdAt || ""),
    highlighted: !!raw.isHighlighted,
    reactions: sumReactions(raw.reactions),
    replies: depth >= 1 ? [] : replies.map(r => normalizeComment(r as { [k: string]: unknown }, depth + 1)),
  };
}

/** Stub-Backend: feste, realistische Fixtures — für Dev/Tests und als UI-Build-Ziel. */
export function makeStubClient(): TchopClient {
  return {
    async getEngagement(_canonicalUrl: string): Promise<Engagement> {
      const top = normalizeComment({
        id: 765086, content: "🐕 musste gerade Fährten verfolgen",
        createdAt: "2025-10-27T21:43:18.000Z", isHighlighted: true,
        reactions: [{ name: "like", count: 1 }],
        author: { screenName: "Sebastian", avatar: { thumb: "https://cdn.example/a.jpg" } },
        replies: [{
          id: 765090, content: "Sehr gut 😄", createdAt: "2025-10-27T22:00:00.000Z",
          isHighlighted: false, reactions: [],
          author: { screenName: "Kai", avatar: { thumb: "https://cdn.example/k.jpg" } },
        }],
      });
      return {
        hasCard: true,
        deepLink: cardDeepLink("steady", 290638, 618856, 46576451),
        reactions: 8,
        commentCount: 2,
        comments: [top],
      };
    },
  };
}

/**
 * Factory: wählt das Backend per Env.
 *  - TCHOP_STUB=1            → Stub (Dev/Tests)
 *  - TCHOP_TOKEN + channelId → real (Phase 3; bis dahin null)
 *  - sonst                   → null (Graceful Degradation: nur CTA)
 */
export function getTchopClient(
  env: { TCHOP_STUB?: unknown; TCHOP_TOKEN?: unknown; [k: string]: unknown } | null | undefined,
  _cfg: EngagementCfg,
): TchopClient | null {
  const e = env || {};
  if (String(e.TCHOP_STUB || "") === "1") return makeStubClient();
  // Phase 3: if (e.TCHOP_TOKEN && cfg.channelId) return makeRealClient(e, cfg);
  return null;
}
