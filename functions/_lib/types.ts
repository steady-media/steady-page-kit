// _lib/types.ts — zentrale TypeScript-Typen für das Kit.
//
// Wird von server-seitigem Code via `import type` eingebunden.
// Browser-Assets (kit-theme.js, kit-panel.js) nutzen JSDoc-@typedef-Kopien
// in den Dateien selbst; kit.config.js importiert KitConfig via @type-Annotation.
//
// Keine Runtime-Exporte — nur Typen. Kompatibel mit Node ≥ 22.18 type stripping
// (erasableSyntaxOnly: true).

// ──────────────────────────────────────────────── Publisher-Konfiguration ──────

/** Navigations-Eintrag in kit.config.js */
export interface KitNavItem {
  /** Label / Anzeigetext */
  l: string;
  /** href / URL */
  h: string;
  /** extern = neuer Tab (optional) */
  x?: boolean;
}

/**
 * Steady-Publikations-Angaben.
 * Enthält Slug (für Feed-URL) und Publikations-ID (für das Widget).
 */
export interface KitSteadyConfig {
  /** Steady-Slug — der Teil hinter steady.page/ in der Publikations-URL */
  slug?: string;
  /** Steady-Publikations-ID (UUID) — lädt das Steady-Widget */
  publicationId?: string;
}

/**
 * Die einzige Datei, die Publisher anfassen: kit.config.js.
 * Wird als Default-Export erwartet.
 */
export interface KitConfig {
  /** Anzeigename der Publikation */
  publication?: string;
  /** Autor:in (optional; Meta-Daten) */
  author?: string;
  /** Sprache der Oberfläche: "de" oder "en" */
  language?: "de" | "en" | (string & {});
  /** Kanonische URL der fertigen Seite, ohne Slash am Ende */
  siteOrigin?: string;
  /** Steady-Slug + Publikations-ID */
  steady?: KitSteadyConfig;
  /** Überschrift, mit der der Mitglieder-Teil beginnt */
  memberHeading?: string;
  /** Explizite Navigation (überschreibt den Kit-Default) */
  nav?: Array<{ l: string; h: string; x?: boolean }> | null;
  /** Teaser pro Seite (Default 12) */
  perPage?: number;
  /** Max. Kategorie-Pills (Default 8) */
  maxPills?: number;
  /** Post-GUID als Aufmacher pinnen */
  pinnedGuid?: string | null;
}

// ──────────────────────────────────────────────── Runtime-Adapter ──────────────

/**
 * Minimales KV-Interface — kompatibel mit dem Cloudflare KV Namespace
 * und dem Node-Emulator (server/fs-kv.js).
 */
export interface KVAdapter {
  get(key: string, opts?: "text" | "json" | "arrayBuffer" | { type?: "text" | "json" | "arrayBuffer"; cacheTtl?: number }): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Cloudflare-Pages-Env-Bindings — alle optionalen Felder; bei Node werden
 * sie per process.env / fs-kv simuliert.
 */
export interface KitEnv {
  /** KV-Namespace (Cloudflare Binding) oder fs-kv-Emulator */
  KIT_KV?: KVAdapter;
  /** Feed-URL-Override (überschreibt den Slug-Ableitungswert) */
  FEED_URL?: string;
  /** Authentifizierter Volltext-Feed (Secret — nie loggen!) */
  FULLTEXT_FEED_URL?: string;
  /** Admin-Code-Gate für globale Schreib-Operationen */
  KIT_ADMIN_CODE?: string;
  /** Canonical-Origin-Override */
  SITE_ORIGIN?: string;
  /** Steady-Publikations-ID-Override */
  STEADY_PUBLICATION_ID?: string;
  /** Steady-Login-URL-Override */
  STEADY_LOGIN_URL?: string;
  /** Cloudflare Web Analytics Beacon-Token (optional) */
  ANALYTICS_TOKEN?: string;
  /** Weitere Host-/Deployment-Variablen (process.env bzw. CF-Bindings). */
  [key: string]: unknown;
}

/**
 * Cloudflare-Pages-Functions-Context — wird von allen Handler-Routen empfangen.
 */
export interface KitContext {
  request: Request;
  env: KitEnv;
  params: Record<string, string>;
  data: Record<string, unknown>;
  waitUntil(p: Promise<unknown>): void;
  /** Nächster Handler in der Middleware-Kette */
  next(): void;
}

/** Cloudflare-Pages-Functions-Handler-Signatur */
export type PagesHandler = (context: KitContext) => Promise<Response> | Response;

// ──────────────────────────────────────────────── Inhalte ──────────────────────

/**
 * Ein geparster RSS-Item aus dem Steady-Feed.
 * Entspricht exakt dem Rückgabe-Shape von parseFeed() in feed.js.
 */
export interface FeedItem {
  title: string;
  description: string;
  categories: string[];
  /** Teaser-Bild-URL (leer wenn nicht vorhanden) */
  image: string;
  link: string;
  /** Steady-GUID (Artikel-Identifier) */
  guid: string;
  pubDate: string;
  /** Volltext-HTML — nur im authentifizierten Feed gefüllt */
  content: string;
}

// ──────────────────────────────────────────────── Globale Config (KV) ─────────

/**
 * Global veröffentlichte Config aus KV (key "config").
 * Wird von getConfig() in settings.js geladen.
 */
export interface GlobalConfig {
  /** Skin-Objekt (CSS-Custom-Properties als Record) */
  skin?: Record<string, string> | null;
  /** Serialisierter kitstruct-Cookie-Wert */
  kitstruct?: string;
  /** Serialisierter kitchrome-Cookie-Wert (JSON: {brand, nav}) */
  kitchrome?: string;
  /** Unix-Timestamp der letzten Speicherung */
  ts?: number;
}

/**
 * Logo-Metadaten aus KV (key "logo:meta").
 * Wird von getLogoMeta() in settings.js geladen.
 */
export interface LogoMeta {
  /** MIME-Typ des Upload-Bilds (z. B. "image/svg+xml") */
  type: string;
  /** Seitenverhältnis als Float (z. B. 4), Default 4. */
  aspect?: number;
  /** Unix-Timestamp der letzten Speicherung */
  ts?: number;
}

// ──────────────────────────────────────────────── Render-Config ──────────────────

/**
 * Seiten-Struktur aus parseStruct() — steuert das serverseitige Rendering.
 * Wird aus dem kitstruct-Cookie + globalem Config-Fallback abgeleitet.
 */
export interface StructCfg {
  /** Seiten-Shell: "single" (einspaltig) | "portal" (Portal mit Leisten) */
  shell: "single" | "portal";
  /** Aufmacher-Größe: "klein" (Split-Hero) | "gross" (Vollbild) */
  auf: "klein" | "gross";
  /** Stream-Layout: "liste" (flache Karten) | "rubrik" (Rubriken-Sektionen) */
  stream: "liste" | "rubrik";
  /** Leisten (Rails) im Portal-Modus */
  rails: string[];
  /** Header-Alignment: "links" | "zentriert" */
  headerStyle: "links" | "zentriert";
  /** Suchfeld aktiviert */
  search: boolean;
  /** Angepasster Publikations-Titel (aus kitchrome-Cookie) */
  brand: string;
  /** Angepasste Navigation (aus kitchrome-Cookie) oder null = Default */
  nav: Array<{ l: string; h: string; x: boolean }> | null;
}

/**
 * Vollständige Render-Config pro Request — StructCfg + KV-Daten + Env-Overrides.
 * Wird von buildPageContext() in settings.js zusammengestellt.
 */
export interface RenderCfg extends StructCfg {
  /** Globaler Skin (CSS-Variablen) aus KV, oder null */
  skin: Record<string, string> | null;
  /** Logo-Metadaten aus KV, oder null */
  logo: LogoMeta | null;
  /** Feed-URL-Override (Env), oder null = Default aus config.js */
  feedUrl: string | null;
  /** Site-Origin-Override (Env), oder null */
  site: string | null;
  /** Steady-Publikations-ID-Override (Env), oder null */
  steadyId: string | null;
  /** Steady-Login-URL-Override (Env), oder null */
  loginUrl: string | null;
  /** Cloudflare Web Analytics Beacon-Token (leer = deaktiviert) */
  analytics: string;
  /** Kanal-Beschreibung (optional) */
  channelDesc?: string;
}
