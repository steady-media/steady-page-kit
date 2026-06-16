// _lib/config.ts — the kit's central constants.
//
// The publisher identity comes from kit.config.js (repo root) — the ONE file
// publishers touch. This module only: validates, derives the Steady URLs from the
// slug, and holds the template's own constants (render params, versions).
// Env overrides (FEED_URL, SITE_ORIGIN, …) apply at request time in
// buildPageContext (settings.ts) and win over everything here.

import kit from "../../kit.config.js";
import { LANGUAGE, t } from "./i18n.ts";
import type { EngagementCfg, EngagementMode } from "./types.ts";

// LANGUAGE is determined from kit.config.js in i18n.ts; re-exported here so
// modules that import LANGUAGE from config keep working.
export { LANGUAGE };

/**
 * Normalize a Steady slug from user input — also accepts full URLs
 * ("https://steady.page/sebastian/rss", "steadyhq.com/de/xyz/about") and "@slug".
 * Locale segments (de/en/…) at the start of the path are skipped.
 */
export function normalizeSlug(input: unknown): string {
  let s = String(input || "").trim().replace(/^@/, "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || /^(www\.)?steady(hq)?\.(page|com)\//i.test(s)) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
      const locales = new Set(["de", "en", "fr", "es", "it"]);
      s = u.pathname.split("/").filter(Boolean).find(seg => !locales.has(seg.toLowerCase())) || "";
    } catch (e) { /* not a parseable URL → keep treating the input as a slug */ }
  }
  return s.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

/** Derive Steady URLs from slug + language; empty slug → empty strings. */
export function deriveSteady(slug: string, language: string): { feedUrl: string; loginUrl: string; newsletterUrl: string } {
  if (!slug) return { feedUrl: "", loginUrl: "", newsletterUrl: "" };
  return {
    feedUrl: `https://steady.page/${slug}/rss`,
    loginUrl: `https://steady.page/${language}/log_in?publication=${slug}`,
    newsletterUrl: `https://steady.page/${language}/${slug}/newsletter/sign_up`,
  };
}

function intOr(v: unknown, def: number): number {
  const n = parseInt(v as string, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export const STEADY_SLUG = normalizeSlug(kit.steady && kit.steady.slug);

const derived = deriveSteady(STEADY_SLUG, LANGUAGE);

export const PUBLICATION = String(kit.publication || "").trim() || t("publication.fallback");
export const AUTHOR = String(kit.author || "").trim();

/** Effective display name: published brand (KV/cookie, cfg.brand) over the kit.config default. */
export function publicationName(cfg?: { brand?: string | null } | null): string {
  const b = cfg && cfg.brand ? String(cfg.brand).trim() : "";
  return b || PUBLICATION;
}

// Canonical origin of this installation (canonical/OG URLs, sitemap, robots).
// Empty = links stay sensibly relative, doctor warns. env-overridable: SITE_ORIGIN
export const SITE_ORIGIN = String(kit.siteOrigin || "").trim().replace(/\/+$/, "");

// Public Steady RSS feed — single source of truth for all content.
// Full text comes from the authenticated feed (secret FULLTEXT_FEED_URL).
// env-overridable: FEED_URL
export const FEED_URL = derived.feedUrl;

// Steady publication ID → loads the widget_loader (login/checkout/paywall).
// env-overridable: STEADY_PUBLICATION_ID
export const STEADY_PUBLICATION_ID = String((kit.steady && kit.steady.publicationId) || "").trim();

// Steady login fallback link (in case the widget doesn't load). env-overridable: STEADY_LOGIN_URL
export const STEADY_LOGIN_URL = derived.loginUrl;

// Newsletter sign-up (default nav entry, only when derivable).
export const NEWSLETTER_URL = derived.newsletterUrl;

// Heading at which the member section begins in the Steady editor; renderPost
// inserts the official Steady paywall element before it. "" → language default.
export const MEMBER_HEADING = String(kit.memberHeading || "").trim() || t("member.headingDefault");

export const PER_PAGE = intOr(kit.perPage, 12);    // teasers per page
export const MAX_PILLS = intOr(kit.maxPills, 8);   // max category pills
export const PINNED_GUID: string | null = kit.pinnedGuid || null; // optional: post GUID as hero

const ENGAGEMENT_MODES: EngagementMode[] = ["none", "claps", "steady-app"];

function asMode(v: unknown, def: EngagementMode): EngagementMode {
  const s = String(v || "").trim();
  return (ENGAGEMENT_MODES as string[]).includes(s) ? (s as EngagementMode) : def;
}

// kit.config.js-Defaults (env gewinnt zur Request-Zeit, siehe effectiveEngagement)
const kitEng = (kit.engagement || {}) as Partial<EngagementCfg>;
const ENGAGEMENT_MODE: EngagementMode = asMode(kitEng.mode, "claps");
const TCHOP_ORG: string = String(kitEng.org || "").trim();
const TCHOP_CHANNEL_ID: number | null = kitEng.channelId ? Number(kitEng.channelId) : null;
const TCHOP_APP_URL: string = String(kitEng.appUrl || "").trim().replace(/\/+$/, "");

/**
 * Effektive Engagement-Config: env-Overrides > kit.config.js. Der Secret-Token
 * (TCHOP_TOKEN) gehört NICHT hierher — er wird nur in der Proxy-Route gelesen.
 */
export function effectiveEngagement(env: { [k: string]: unknown } | null | undefined): EngagementCfg {
  const e = env || {};
  return {
    mode: asMode(e.ENGAGEMENT_MODE, ENGAGEMENT_MODE),
    org: String(e.TCHOP_ORG || TCHOP_ORG).trim(),
    channelId: e.TCHOP_CHANNEL_ID ? Number(e.TCHOP_CHANNEL_ID) : TCHOP_CHANNEL_ID,
    appUrl: String(e.TCHOP_APP_URL || TCHOP_APP_URL).trim().replace(/\/+$/, ""),
  };
}

/** Per-Card-Deeplink (öffnet App, Web-Fallback). Format verifiziert 2026-06-16. */
export function cardDeepLink(org: string, channelId: number, storyId: number, cardId: number): string {
  const safeOrg = String(org).replace(/[^a-z0-9-]/gi, ""); // Subdomain — nur erlaubte Zeichen
  return `https://${safeOrg}.tchop.io/apps/posts/${channelId}/${storyId}/${cardId}`;
}

/** true as soon as kit.config.js yields a feed source. Env overrides also count
 *  at request time — use isConfigured(cfg) in settings.ts for that. */
export const IS_CONFIGURED = !!FEED_URL;

/**
 * Env override from STEADY_SLUG: derives feed/login/newsletter URLs so one-click
 * deploys (Railway et al.) work without editing kit.config.js — the publisher
 * only supplies their slug. null when no STEADY_SLUG is set.
 */
export function envSteadyUrls(env: { STEADY_SLUG?: unknown; [k: string]: unknown } | null | undefined): { feedUrl: string; loginUrl: string; newsletterUrl: string } | null {
  const slug = normalizeSlug(env && env.STEADY_SLUG);
  return slug ? deriveSteady(slug, LANGUAGE) : null;
}

/**
 * Effective feed URL for routes that do NOT go through buildPageContext
 * (rss, sitemap, search). Precedence: FEED_URL env > STEADY_SLUG env > kit.config.js.
 */
export function effectiveFeedUrl(env: { FEED_URL?: unknown; STEADY_SLUG?: unknown; [k: string]: unknown } | null | undefined): string {
  const explicit = String((env && env.FEED_URL) || "").trim();
  if (explicit) return explicit;
  const bySlug = envSteadyUrls(env);
  return bySlug ? bySlug.feedUrl : FEED_URL;
}

// Editable default navigation (overridable via kitchrome cookie / global config).
// l = label, h = href, x = external (new tab).
export const DEFAULT_NAV: Array<{ l: string; h: string; x?: boolean }> = (Array.isArray(kit.nav) && kit.nav.length)
  ? kit.nav.filter(n => n && n.l && n.h).slice(0, 8)
      .map(n => ({ l: String(n.l).slice(0, 40), h: String(n.h).slice(0, 300), x: !!n.x }))
  : [
      { l: t("nav.posts"), h: "/" },
      { l: t("nav.member"), h: "/memberships" },
      ...(NEWSLETTER_URL ? [{ l: t("nav.newsletter"), h: NEWSLETTER_URL, x: true }] : []),
    ];

/* — Template-owned constants (belong to the kit, not the publisher) — */

// User-Agent for feed requests (identifies the kit to Steady).
export const USER_AGENT = "SteadyPageKit/1.0";

// Cache buster for public/assets/kit.css + kit-*.js — bump on asset changes.
export const ASSET_VERSION = "2026-06-16b";
