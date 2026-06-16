// _lib/types.ts — central TypeScript types for the kit.
//
// Imported by server-side code via `import type`.
// Browser assets (kit-theme.js, kit-panel.js) use JSDoc @typedef copies in the
// files themselves; kit.config.js imports KitConfig via a @type annotation.
//
// No runtime exports — types only. Compatible with Node ≥ 22.18 type stripping
// (erasableSyntaxOnly: true).

// ──────────────────────────────────────────────── Publisher configuration ──────

/** Navigation entry in kit.config.js */
export interface KitNavItem {
  /** label / display text */
  l: string;
  /** href / URL */
  h: string;
  /** external = new tab (optional) */
  x?: boolean;
}

/**
 * Steady publication details.
 * Holds the slug (for the feed URL) and the publication ID (for the widget).
 */
export interface KitSteadyConfig {
  /** Steady slug — the part after steady.page/ in the publication URL */
  slug?: string;
  /** Steady publication ID (UUID) — loads the Steady widget */
  publicationId?: string;
}

/**
 * The only file publishers touch: kit.config.js.
 * Expected as the default export.
 */
export interface KitConfig {
  /** Display name of the publication */
  publication?: string;
  /** Author (optional; meta data) */
  author?: string;
  /** UI language: "de" or "en" */
  language?: "de" | "en" | (string & {});
  /** Canonical URL of the finished site, without a trailing slash */
  siteOrigin?: string;
  /** Steady slug + publication ID */
  steady?: KitSteadyConfig;
  /** Heading at which the member section begins */
  memberHeading?: string;
  /** Explicit navigation (overrides the kit default) */
  nav?: Array<{ l: string; h: string; x?: boolean }> | null;
  /** Teasers per page (default 12) */
  perPage?: number;
  /** Max category pills (default 8) */
  maxPills?: number;
  /** Pin a post GUID as the lead story */
  pinnedGuid?: string | null;
  /** Engagement configuration (mode + Tchop parameters, optional) */
  engagement?: Partial<EngagementCfg>;
}

// ──────────────────────────────────────────────── Runtime adapters ─────────────

/**
 * Minimal KV interface — compatible with the Cloudflare KV namespace
 * and the Node emulator (server/fs-kv.ts).
 */
export interface KVAdapter {
  get(key: string, opts?: "text" | "json" | "arrayBuffer" | { type?: "text" | "json" | "arrayBuffer"; cacheTtl?: number }): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Cloudflare Pages env bindings — all optional fields; on Node they are
 * simulated via process.env / fs-kv.
 */
export interface KitEnv {
  /** KV namespace (Cloudflare binding) or fs-kv emulator */
  KIT_KV?: KVAdapter;
  /** Feed URL override (overrides the slug-derived value) */
  FEED_URL?: string;
  /** Authenticated full-text feed (secret — never log!) */
  FULLTEXT_FEED_URL?: string;
  /** Read-scoped Tchop API token for the steady-app engagement proxy (secret — never log!) */
  TCHOP_TOKEN?: string;
  /** Admin-code gate for global write operations */
  KIT_ADMIN_CODE?: string;
  /** Canonical origin override */
  SITE_ORIGIN?: string;
  /** Steady publication ID override */
  STEADY_PUBLICATION_ID?: string;
  /** Steady login URL override */
  STEADY_LOGIN_URL?: string;
  /** Cloudflare Web Analytics beacon token (optional) */
  ANALYTICS_TOKEN?: string;
  /** Further host/deployment variables (process.env or CF bindings). */
  [key: string]: unknown;
}

/**
 * Cloudflare Pages Functions context — received by all handler routes.
 */
export interface KitContext {
  request: Request;
  env: KitEnv;
  params: Record<string, string>;
  data: Record<string, unknown>;
  waitUntil(p: Promise<unknown>): void;
  /** Next handler in the middleware chain */
  next(): void;
}

/** Cloudflare Pages Functions handler signature */
export type PagesHandler = (context: KitContext) => Promise<Response> | Response;

// ──────────────────────────────────────────────── Content ──────────────────────

/**
 * A parsed RSS item from the Steady feed.
 * Matches exactly the return shape of parseFeed() in feed.ts.
 */
export interface FeedItem {
  title: string;
  description: string;
  categories: string[];
  /** Teaser image URL (empty when absent) */
  image: string;
  link: string;
  /** Steady GUID (article identifier) */
  guid: string;
  pubDate: string;
  /** Full-text HTML — only populated in the authenticated feed */
  content: string;
}

// ──────────────────────────────────────────────── Global config (KV) ───────────

/**
 * Globally published config from KV (key "config").
 * Loaded by getConfig() in settings.ts.
 */
export interface GlobalConfig {
  /** Skin object (CSS custom properties as a record) */
  skin?: Record<string, string> | null;
  /** Serialized kitstruct cookie value */
  kitstruct?: string;
  /** Serialized kitchrome cookie value (JSON: {brand, nav}) */
  kitchrome?: string;
  /** Serialized kitpins cookie value (JSON: {scope: [guid]}) */
  kitpins?: string;
  /** Unix timestamp of the last save */
  ts?: number;
}

/**
 * Logo metadata from KV (key "logo:meta").
 * Loaded by getLogoMeta() in settings.ts.
 */
export interface LogoMeta {
  /** MIME type of the uploaded image (e.g. "image/svg+xml") */
  type: string;
  /** Aspect ratio as a float (e.g. 4), default 4. */
  aspect?: number;
  /** Unix timestamp of the last save */
  ts?: number;
}

// ──────────────────────────────────────────────── Engagement ───────────────────

/** Post engagement source per installation. Protocol values — do not translate. */
export type EngagementMode = "none" | "claps" | "steady-app";

/** Engagement configuration (kit.config.js / env). Not a secret — the token lives in env. */
export interface EngagementCfg {
  mode: EngagementMode;
  org: string;              // Tchop org subdomain, e.g. "steady" → https://steady.tchop.io/…
  channelId: number | null; // Tchop channel ID of the publication (steady-app)
  appUrl: string;           // fallback target for the "open in app" CTA without a per-card deep link
}

// ──────────────────────────────────────────────── Render config ────────────────

/**
 * Page structure from parseStruct() — drives the server-side rendering.
 * Derived from the kitstruct cookie + global config fallback.
 */
export interface StructCfg {
  /** Page shell: "single" (single column) | "portal" (portal with rails) */
  shell: "single" | "portal";
  /** Lead-story size: "klein" (split hero) | "gross" (full width) */
  auf: "klein" | "gross";
  /** Stream layout: "liste" (flat cards) | "rubrik" (section blocks) */
  stream: "liste" | "rubrik";
  /** Rails in portal mode */
  rails: string[];
  /** Header alignment: "links" | "zentriert" */
  headerStyle: "links" | "zentriert";
  /** Search field enabled */
  search: boolean;
  /** Customized publication title (from the kitchrome cookie) */
  brand: string;
  /** Customized navigation (from the kitchrome cookie) or null = default */
  nav: Array<{ l: string; h: string; x: boolean }> | null;
  /** Footer links (from the kitchrome cookie) or null = no links */
  foot: Array<{ l: string; h: string; x: boolean }> | null;
  /** Pinned posts per section: scope ("/" | "rubrik/<slug>") → GUID list (max 3). */
  pins: Record<string, string[]>;
}

/**
 * Full render config per request — StructCfg + KV data + env overrides.
 * Assembled by buildPageContext() in settings.ts.
 */
export interface RenderCfg extends StructCfg {
  /** Global skin (CSS variables) from KV, or null */
  skin: Record<string, string> | null;
  /** Logo metadata from KV, or null */
  logo: LogoMeta | null;
  /** Feed URL override (env), or null = default from config.ts */
  feedUrl: string | null;
  /** Site origin override (env), or null */
  site: string | null;
  /** Steady publication ID override (env), or null */
  steadyId: string | null;
  /** Steady login URL override (env), or null */
  loginUrl: string | null;
  /** Cloudflare Web Analytics beacon token (empty = disabled) */
  analytics: string;
  /** Channel description (optional) */
  channelDesc?: string;
  /** Engagement configuration (mode + Tchop parameters) */
  engagement: EngagementCfg;
}
