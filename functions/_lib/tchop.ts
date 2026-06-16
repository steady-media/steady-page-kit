// _lib/tchop.ts — adapter for the Steady-App engagement source (Tchop).
// One interface, two backends (stub + real). The real HTTP backend follows in
// phase 3 once a read-scoped token + endpoint are available — until then the
// factory returns null even when TCHOP_TOKEN is present (graceful degradation).
import { cardDeepLink } from "./config.ts";
import type { EngagementCfg } from "./types.ts";

/** Normalized comment — ONLY safe fields (no PII). */
export interface EngComment {
  id: number;
  author: { name: string; avatar: string | null };
  text: string;
  ts: string;
  highlighted: boolean;
  reactions: number;        // sum of all reactions
  replies: EngComment[];
}

/** Normalized engagement data for a post. */
export interface Engagement {
  hasCard: boolean;         // false = article not yet synced to the app
  deepLink: string;         // per-card or fallback deep link
  reactions: number;        // sum of all card reactions
  commentCount: number;
  comments: EngComment[];
}

export interface TchopClient {
  /** canonicalUrl = the Steady post URL (RSS <link>), join key on card.content.url. */
  getEngagement(canonicalUrl: string): Promise<Engagement | null>;
}

function sumReactions(rs: unknown): number {
  if (!Array.isArray(rs)) return 0;
  return rs.reduce((n, r) => n + (Number((r as { count?: unknown }).count) || 0), 0);
}

/**
 * Reduce a raw Tchop comment to the safe EngComment shape. Deliberately drops
 * author.email/location/roleId/links (PII) — see spec §14.5.
 * Recursive: nested replies are normalized as well.
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

/** Stub backend: fixed, realistic fixtures — for dev/tests and as a UI build target. */
export function makeStubClient(): TchopClient {
  return {
    async getEngagement(_canonicalUrl: string): Promise<Engagement> {
      const top = normalizeComment({
        id: 765086, content: "🐕 musste gerade Fährten verfolgen",
        createdAt: "2025-10-27T21:43:18.000Z", isHighlighted: true,
        reactions: [{ name: "like", count: 1 }],
        // Demo avatars (stub/preview only, never production) — real image URLs to make the preview realistic.
        author: { screenName: "Sebastian", avatar: { thumb: "https://i.pravatar.cc/48?img=12" } },
        replies: [{
          id: 765090, content: "Sehr gut 😄", createdAt: "2025-10-27T22:00:00.000Z",
          isHighlighted: false, reactions: [],
          author: { screenName: "Kai", avatar: { thumb: "https://i.pravatar.cc/48?img=32" } },
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
 * Factory: selects the backend via env.
 *  - TCHOP_STUB=1            → stub (dev/tests)
 *  - TCHOP_TOKEN + channelId → real (phase 3; null until then)
 *  - otherwise               → null (graceful degradation: CTA only)
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
