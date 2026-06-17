// @ts-check
/* kit-theme.js — the kit's early theme engine.
 *
 * Runs BLOCKING in the <head> so saved settings are in place before the first
 * paint (no theme flash). Data sources, in this precedence:
 *   1. localStorage        — this browser's personal settings (win)
 *   2. window.KIT_GLOBAL   — globally published settings (server-injected from KV)
 *
 * Public API (used by kit-panel.js):
 *   Catalogs : KIT_FONTS, KIT_FONT_CATS, KIT_PAIRS, KIT_PALETTES, KIT_BASES, KIT_LOOKS
 *   Setters  : kitApplyFont, kitColor, kitPalette, kitBase, kitType, kitCard,
 *              kitSetLayout, kitLook, kitStructSet, kitChromeSet
 *   Helpers  : KIT_RATIO (WCAG contrast), KIT_RL (relative luminance)
 *
 * Skin setters apply live (CSS variables/classes on <html>); structure setters
 * (kitStructSet/kitChromeSet) write a cookie and reload the page, because the
 * server renders the structure.
 */

/**
 * @typedef {{ n: string, s: string, c: string, g?: string, w?: string }} KitFont
 * @typedef {{ n: string, h: string, b: string }} KitFontPair
 * @typedef {{ n: string, v: Record<string,string> }} KitPalette
 * @typedef {{ n: string, d?: string, head: string, body: string, base: string, palette?: number, type: Record<string,string>, layout: Record<string,string>, card: Record<string,string>, colors?: Record<string,string>, struct?: Record<string,string|string[]> }} KitLook
 */

/**
 * Global window extensions of the kit (catalogs, setters, helpers).
 * @typedef {Object} KitWindowExtensions
 * @property {KitFont[]} KIT_FONTS
 * @property {string[]} KIT_FONT_CATS
 * @property {KitFontPair[]} KIT_PAIRS
 * @property {string} KIT_DEFAULT_HEAD
 * @property {string} KIT_DEFAULT_BODY
 * @property {KitPalette[]} KIT_PALETTES
 * @property {Record<string, Record<string,string>>} KIT_BASES
 * @property {KitLook[]} KIT_LOOKS
 * @property {Record<string, KitFont>} KIT_BUNNY
 * @property {KitFont[]} KIT_BUNNY_LIST
 * @property {(slug: string) => KitFont} kitFont
 * @property {(f: KitFont) => void} kitFontCss
 * @property {Record<string, unknown>|undefined} KIT_GLOBAL
 * @property {Record<string, unknown>|undefined} KIT_I18N
 * @property {string|undefined} KIT_LOCALE
 * @property {string|undefined} KIT_DEFAULT_BRAND
 * @property {Array<{l:string,h:string,x:boolean}>|undefined} KIT_DEFAULT_NAV
 * @property {(a: string, b: string) => number} KIT_RATIO
 * @property {(h: string) => number} KIT_RL
 * @property {(role: string, x: unknown, save?: boolean) => void} kitApplyFont
 * @property {(name: string, val: string, save?: boolean) => void} kitColor
 * @property {(idx: number, save?: boolean) => void} kitPalette
 * @property {(mode: string, save?: boolean) => void} kitBase
 * @property {(kind: string, val: string, save?: boolean) => void} kitType
 * @property {(kind: string, val: string, save?: boolean) => void} kitCard
 * @property {(kind: string, val: string, save?: boolean) => void} kitSetLayout
 * @property {(obj: Record<string,unknown>, reload?: boolean) => void} kitStructSet
 * @property {(o: Record<string,unknown>) => void} kitChromeSet
 * @property {(idx: number, save?: boolean) => void} kitLook
 */

// Type extension for window in the browser context (JSDoc only, no runtime effect).
/** @type {Window & typeof globalThis & KitWindowExtensions} */
var _w = /** @type {any} */ (window);

/* — Font catalog: ALL Fontshare originals (ITF Free Font License); Google/OFL
     fonts are excluded. n=name, s=slug, c=category (label), g=generic fallback
     (default sans-serif). Weights default to 400/500/700 in loadFontCss() —
     Fontshare returns only the weights a family actually ships. Loaded via
     api.fontshare.com (not Google) → GDPR-friendly; swap loadFontCss() for
     self-hosted @font-face when you want zero third-party requests. — */
_w.KIT_FONTS = [
  // — Sans —
  { n: "Switzer", s: "switzer", c: "Sans" },
  { n: "General Sans", s: "general-sans", c: "Sans" },
  { n: "Satoshi", s: "satoshi", c: "Sans" },
  { n: "Supreme", s: "supreme", c: "Sans" },
  { n: "Synonym", s: "synonym", c: "Sans" },
  { n: "Author", s: "author", c: "Sans" },
  { n: "Clash Grotesk", s: "clash-grotesk", c: "Sans" },
  { n: "Cabinet Grotesk", s: "cabinet-grotesk", c: "Sans" },
  { n: "Chillax", s: "chillax", c: "Sans" },
  { n: "Technor", s: "technor", c: "Sans" },
  { n: "Alpino", s: "alpino", c: "Sans" },
  { n: "Amulya", s: "amulya", c: "Sans" },
  { n: "Excon", s: "excon", c: "Sans" },
  { n: "Pally", s: "pally", c: "Sans" },
  { n: "Quilon", s: "quilon", c: "Sans" },
  { n: "Plein", s: "plein", c: "Sans" },
  { n: "RX100", s: "rx-100", c: "Sans" },
  { n: "Bespoke Sans", s: "bespoke-sans", c: "Sans" },
  { n: "Pilcrow Rounded", s: "pilcrow-rounded", c: "Sans" },
  { n: "Pramukh Rounded", s: "pramukh-rounded", c: "Sans" },
  // — Serif —
  { n: "Sentient", s: "sentient", g: "serif", c: "Serif" },
  { n: "Gambetta", s: "gambetta", g: "serif", c: "Serif" },
  { n: "Gambarino", s: "gambarino", g: "serif", c: "Serif" },
  { n: "Rowan", s: "rowan", g: "serif", c: "Serif" },
  { n: "Zodiak", s: "zodiak", g: "serif", c: "Serif" },
  { n: "Erode", s: "erode", g: "serif", c: "Serif" },
  { n: "Recia", s: "recia", g: "serif", c: "Serif" },
  { n: "Neco", s: "neco", g: "serif", c: "Serif" },
  { n: "Bonny", s: "bonny", g: "serif", c: "Serif" },
  { n: "Bespoke Serif", s: "bespoke-serif", g: "serif", c: "Serif" },
  { n: "Ranade", s: "ranade", g: "serif", c: "Serif" },
  // — Slab —
  { n: "Bespoke Slab", s: "bespoke-slab", g: "serif", c: "Slab" },
  { n: "Hoover", s: "hoover", g: "serif", c: "Slab" },
  { n: "Paquito", s: "paquito", g: "serif", c: "Slab" },
  { n: "Trench Slab", s: "trench-slab", g: "serif", c: "Slab" },
  // — Display —
  { n: "Clash Display", s: "clash-display", c: "Display" },
  { n: "Tanker", s: "tanker", c: "Display" },
  { n: "Expose", s: "expose", c: "Display" },
  { n: "New Title", s: "new-title", c: "Display" },
  { n: "Panchang", s: "panchang", c: "Display" },
  { n: "Bespoke Stencil", s: "bespoke-stencil", c: "Display" },
  { n: "Kihim", s: "kihim", c: "Display" },
  { n: "Striper", s: "striper", c: "Display" },
  { n: "Boxing", s: "boxing", c: "Display" },
  { n: "Kohinoor Zerone", s: "kohinoor-zerone", c: "Display" },
  { n: "Array", s: "array", c: "Display" },
  { n: "Kola", s: "kola", c: "Display" },
  { n: "Nippo", s: "nippo", c: "Display" },
  { n: "Styro", s: "styro", c: "Display" },
  { n: "Segment", s: "segment", c: "Display" },
  { n: "Zina", s: "zina", c: "Display" },
  { n: "Boska", s: "boska", g: "serif", c: "Display" },
  { n: "Melodrama", s: "melodrama", g: "serif", c: "Display" },
  { n: "Stardom", s: "stardom", g: "serif", c: "Display" },
  { n: "Chubbo", s: "chubbo", g: "serif", c: "Display" },
  { n: "Aktura", s: "aktura", g: "serif", c: "Display" },
  { n: "Bevellier", s: "bevellier", g: "serif", c: "Display" },
  // — Script & handwriting —
  { n: "Comico", s: "comico", g: "cursive", c: "Script" },
  { n: "Britney", s: "britney", g: "cursive", c: "Script" },
  { n: "Pencerio", s: "pencerio", g: "cursive", c: "Script" },
  { n: "Telma", s: "telma", g: "cursive", c: "Script" },
  { n: "Rosaline", s: "rosaline", g: "cursive", c: "Script" },
  { n: "Sharpie", s: "sharpie", g: "cursive", c: "Script" },
  // — Mono —
  { n: "Tabular", s: "tabular", g: "monospace", c: "Mono" },
];
_w.KIT_FONT_CATS = ["Sans", "Serif", "Slab", "Display", "Script", "Mono"];

/* — Curated font pairs (from the publisher's Fontshare shortlist):
     h = heading slug, b = body slug. Names are localized via KIT_I18N.pairs. — */
_w.KIT_PAIRS = [
  { n: "Bold & clean", h: "chubbo", b: "supreme" },
  { n: "Heavy & readable", h: "tanker", b: "erode" },
  { n: "One family", h: "general-sans", b: "general-sans" },
  { n: "Swiss calm", h: "switzer", b: "switzer" },
  { n: "Display & serif", h: "tanker", b: "bespoke-serif" },
  { n: "Sans meets serif", h: "general-sans", b: "gambetta" },
  { n: "Grotesque editorial", h: "plein", b: "switzer" },
  { n: "Modern & literary", h: "satoshi", b: "erode" },
  { n: "Contrast", h: "boska", b: "switzer" },
  { n: "Masthead", h: "expose", b: "author" },
  { n: "Poster", h: "boxing", b: "chillax" },
  { n: "Condensed", h: "stardom", b: "switzer" },
  { n: "Soft & round", h: "pramukh-rounded", b: "pilcrow-rounded" },
  { n: "Tall & elegant", h: "zodiak", b: "sentient" },
  { n: "Magazine", h: "cabinet-grotesk", b: "ranade" },
];
_w.KIT_DEFAULT_HEAD = "switzer";
_w.KIT_DEFAULT_BODY = "switzer";

/* — Color schemes (set ALL color tokens consistently) — */
_w.KIT_PALETTES = [
  { n: "Steady",   v: { "--color-brand": "#137EC0", "--color-ink": "#291E38", "--color-ink-soft": "#6B6577", "--color-accent": "#FF7264", "--color-line": "#9A95A6", "--color-hairline": "#ECEAEF", "--color-bg": "#FFFFFF" } },
  { n: "Night",    v: { "--color-brand": "#4DA3E0", "--color-ink": "#ECEAF2", "--color-ink-soft": "#A6A2B5", "--color-accent": "#FF7264", "--color-line": "#5A5470", "--color-hairline": "#2A2636", "--color-bg": "#14121A" } },
  { n: "Forest",   v: { "--color-brand": "#1E7A4F", "--color-ink": "#1C2B22", "--color-ink-soft": "#5C6B62", "--color-accent": "#E0823C", "--color-line": "#9AA89F", "--color-hairline": "#E7EEE9", "--color-bg": "#FFFFFF" } },
  { n: "Bordeaux", v: { "--color-brand": "#8E2B43", "--color-ink": "#2B1A20", "--color-ink-soft": "#6E5860", "--color-accent": "#C99A2E", "--color-line": "#B39AA2", "--color-hairline": "#F0E8EB", "--color-bg": "#FFFFFF" } },
  { n: "Mono",     v: { "--color-brand": "#291E38", "--color-ink": "#1A1A1A", "--color-ink-soft": "#6B6B6B", "--color-accent": "#1A1A1A", "--color-line": "#B0B0B0", "--color-hairline": "#ECECEC", "--color-bg": "#FFFFFF" } },
];

/* — Light/dark base (only surface/text tokens, brand/accent stay) — */
_w.KIT_BASES = {
  light: { "--color-bg": "#FFFFFF", "--color-ink": "#291E38", "--color-ink-soft": "#6B6577", "--color-line": "#9A95A6", "--color-hairline": "#ECEAEF" },
  dark:  { "--color-bg": "#14121A", "--color-ink": "#ECEAF2", "--color-ink-soft": "#A6A2B5", "--color-line": "#5A5470", "--color-hairline": "#2A2636" },
};

/* — Looks: one click = a vetted overall style (fonts + colors + layout + cards,
     optionally struct → server reload for the page structure) — */
_w.KIT_LOOKS = [
  { n: "Steady", d: "Clear & journalistic", head: "switzer", body: "switzer", base: "light", palette: 0,
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "classic", surface: "flat", image: "farbe", aspect: "16:9" } },
  { n: "Magazine", d: "Serifs & contrast", head: "boska", body: "gambetta", base: "light",
    type: { size: "gross", lead: "normal", track: "eng", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "classic", surface: "flat", image: "farbe", aspect: "4:3" } },
  { n: "Minimal", d: "Calm, lots of whitespace", head: "synonym", body: "synonym", base: "light", palette: 4,
    type: { size: "standard", lead: "luftig", track: "normal", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "grosszuegig", hero: "split", width: "schmal" },
    card: { style: "text", surface: "flat", image: "farbe", aspect: "16:9" } },
  { n: "Bold", d: "Loud & uppercase", head: "tanker", body: "supreme", base: "light", palette: 0,
    type: { size: "gross", lead: "normal", track: "eng", case: "gross", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "overlay", surface: "flat", image: "farbe", aspect: "16:9" } },
  { n: "Classic", d: "Elegant & centered", head: "zodiak", body: "erode", base: "light", palette: 3,
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "zentriert" },
    layout: { corner: "rund", dens: "komfortabel", hero: "center", width: "standard" },
    card: { style: "classic", surface: "soft", image: "graustufen", aspect: "4:3" } },
  { n: "Night", d: "Dark mode", head: "satoshi", body: "satoshi", base: "dark", palette: 1,
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    layout: { corner: "rund", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "classic", surface: "outline", image: "farbe", aspect: "16:9" } },
  { n: "Magazine portal", d: "3 columns, sectioned", head: "general-sans", body: "gambetta", base: "light",
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "breit", cols: "4", nav: "figma" },
    card: { style: "classic", surface: "flat", image: "farbe", aspect: "4:3" },
    colors: { "--color-brand": "#954FCF", "--color-accent": "#954FCF" },
    struct: { shell: "portal", auf: "gross", stream: "rubrik", rails: ["neueste", "meist", "themen"] } },
];

(function () {
  var D = document.documentElement;
  var loadedFonts = { switzer: 1 }; // the default font already ships as a <link> in the <head>

  /* — Color helpers (WCAG) — */
  /** @param {string} h */
  function hexToRgb(h) {
    h = (h || "").replace("#", "");
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  /** @param {string} h */
  function relLuminance(h) {
    var c = hexToRgb(h).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  /** @param {string} a @param {string} b */
  function contrastRatio(a, b) {
    var L1 = relLuminance(a), L2 = relLuminance(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }
  // Button text color: dark on light brands, white on dark ones
  /** @param {string} brand */
  function buttonFg(brand) { return relLuminance(brand) > 0.42 ? "#16121d" : "#ffffff"; }
  _w.KIT_RATIO = contrastRatio;
  _w.KIT_RL = relLuminance;

  /* — Storage: localStorage first, then the globally published base (KIT_GLOBAL) — */
  /** @param {string} k */
  function gget(k) {
    try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {}
    return (_w.KIT_GLOBAL && _w.KIT_GLOBAL[k] != null) ? _w.KIT_GLOBAL[k] : null;
  }
  /** @param {string} k */
  function jget(k) {
    var v = gget(k);
    if (v != null) { try { return JSON.parse(/** @type {string} */ (v)); } catch (e) {} }
    return {};
  }
  /** @param {string} k @param {unknown} o */
  function jset(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
  /** @param {string} k @param {string} v */
  function ssave(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  /** @param {string} store @param {string} k @param {unknown} v */
  function setObj(store, k, v) { var o = jget(store); o[k] = v; jset(store, o); }

  /* — Fonts: slug | descriptor | JSON string → resolve to descriptor {s,n,g,w} + load Fontshare CSS — */
  /** @param {string} s */
  function titleCase(s) {
    var p = String(s || "").split("-");
    for (var i = 0; i < p.length; i++) p[i] = p[i].charAt(0).toUpperCase() + p[i].slice(1);
    return p.join(" ");
  }
  /** @param {string} slug @returns {KitFont} */
  function bySlug(slug) {
    for (var i = 0; i < _w.KIT_FONTS.length; i++) if (_w.KIT_FONTS[i].s === slug) return _w.KIT_FONTS[i];
    if (_w.KIT_BUNNY && _w.KIT_BUNNY[slug]) return _w.KIT_BUNNY[slug]; // catalog from kit-panel.js
    return { s: slug, n: titleCase(slug), g: "sans-serif", w: "400,700", c: "" };
  }
  /** @param {unknown} x @returns {KitFont} */
  function resolveFont(x) {
    if (x && typeof x === "object" && /** @type {any} */ (x).s) return /** @type {KitFont} */ (x);
    if (typeof x === "string") {
      if (x.charAt(0) === "{") { try { var o = JSON.parse(x); if (o && o.s) return o; } catch (e) {} }
      return bySlug(x);
    }
    return bySlug(_w.KIT_DEFAULT_HEAD);
  }
  /** @param {KitFont} f */
  function loadFontCss(f) {
    if (/** @type {Record<string,unknown>} */ (loadedFonts)[f.s]) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://api.fontshare.com/v2/css?f[]=" + f.s + "@" + (f.w || "400,500,700") + "&display=swap";
    document.head.appendChild(l);
    /** @type {Record<string,unknown>} */ (loadedFonts)[f.s] = 1;
  }
  // Expose for the panel: resolve a slug to a descriptor + load its CSS without applying it
  // (used by the pairings gallery to preview both fonts of a combination).
  _w.kitFont = bySlug;
  _w.kitFontCss = loadFontCss;

  /* — Public setters — */

  // role = "head" | "body"; x = slug, descriptor or a stored JSON string.
  // Persists the RESOLVED descriptor so arbitrary Bunny fonts survive the reload.
  _w.kitApplyFont = function (role, x, save) {
    var f = resolveFont(x);
    loadFontCss(f);
    D.style.setProperty(role === "head" ? "--font-head" : "--font-body", '"' + f.n + '", ' + (f.g || "sans-serif"));
    if (save) {
      try { localStorage.setItem(role === "head" ? "kitFontHead" : "kitFontBody", JSON.stringify({ s: f.s, n: f.n, g: f.g || "sans-serif", w: f.w || "" })); } catch (e) {}
    }
  };

  // Set a single color. Brand → also update the button text color; background →
  // auto-contrast the text/line tones to light/dark (stay readable).
  _w.kitColor = function (name, val, save) {
    D.style.setProperty(name, val);
    if (name === "--color-brand") D.style.setProperty("--btn-fg", buttonFg(val));
    /** @type {Record<string,string>|null} */
    var extra = null;
    if (name === "--color-bg") {
      var dark = relLuminance(val) < 0.42;
      extra = dark
        ? { "--color-ink": "#ECEAF2", "--color-ink-soft": "#A6A2B5", "--color-line": "#5A5470", "--color-hairline": "#2A2636" }
        : { "--color-ink": "#291E38", "--color-ink-soft": "#6B6577", "--color-line": "#9A95A6", "--color-hairline": "#ECEAEF" };
      for (var e in extra) D.style.setProperty(e, extra[e]);
    }
    if (save) {
      var c = jget("kitColors");
      c[name] = val;
      if (extra) for (var e2 in extra) c[e2] = extra[e2];
      jset("kitColors", c);
    }
  };

  _w.kitPalette = function (idx, save) {
    var p = _w.KIT_PALETTES[idx];
    if (!p) return;
    var c = save ? jget("kitColors") : null;
    for (var k in p.v) { D.style.setProperty(k, p.v[k]); if (c) c[k] = p.v[k]; }
    D.style.setProperty("--btn-fg", buttonFg(p.v["--color-brand"]));
    if (save) { jset("kitColors", c); ssave("kitPalette", String(idx)); }
  };

  _w.kitBase = function (mode, save) {
    var b = _w.KIT_BASES[mode];
    if (!b) return;
    var c = save ? jget("kitColors") : null;
    for (var k in b) { D.style.setProperty(k, b[k]); if (c) c[k] = b[k]; }
    if (save) { jset("kitColors", c); ssave("kitBase", mode); }
  };

  _w.kitType = function (kind, val, save) {
    if (kind === "size") D.style.setProperty("--fs", val === "klein" ? "0.92" : val === "gross" ? "1.12" : "1");
    else if (kind === "lead") D.style.setProperty("--lh-body", val === "eng" ? "1.4" : val === "luftig" ? "1.75" : "1.55");
    else if (kind === "track") D.style.setProperty("--track-head", val === "eng" ? "-.04em" : val === "weit" ? ".06em" : "-.01em");
    else if (kind === "case") D.style.setProperty("--case-head", val === "gross" ? "uppercase" : val === "title" ? "capitalize" : "none");
    else if (kind === "align") D.style.setProperty("--align-head", val === "zentriert" ? "center" : "left");
    if (save) setObj("kitType", kind, val);
  };

  _w.kitCard = function (kind, val, save) {
    if (kind === "style") {
      D.classList.remove("card-side", "card-text", "card-overlay", "card-list");
      if (val !== "classic") D.classList.add("card-" + val);
    } else if (kind === "aspect") {
      D.style.setProperty("--card-ar", val === "4:3" ? "4/3" : val === "1:1" ? "1/1" : "16/9");
    } else if (kind === "surface") {
      D.classList.remove("surf-soft", "surf-outline");
      if (val !== "flat") D.classList.add("surf-" + val);
    } else if (kind === "image") {
      D.classList.remove("img-gray", "img-duo");
      if (val === "graustufen") D.classList.add("img-gray");
      else if (val === "duotone") D.classList.add("img-duo");
    }
    if (save) setObj("kitCard", kind, val);
  };

  _w.kitSetLayout = function (kind, val, save) {
    if (kind === "cols") D.style.setProperty("--grid-cols", val);
    else if (kind === "width") D.style.setProperty("--container", val === "schmal" ? "920px" : val === "breit" ? "1200px" : "1024px");
    else if (kind === "corner") {
      var round = val === "rund";
      D.style.setProperty("--radius-card", round ? "10px" : "0");
      D.style.setProperty("--radius-btn", round ? "8px" : "1px");
    } else if (kind === "dens") {
      D.classList.remove("dens-compact", "dens-roomy");
      if (val === "kompakt") D.classList.add("dens-compact");
      else if (val === "grosszuegig") D.classList.add("dens-roomy");
    } else if (kind === "hero") D.classList.toggle("hero-center", val === "center");
    else if (kind === "nav") D.classList.toggle("nav-figma", val === "figma");
    if (save) setObj("kitLayout", kind, val);
  };

  /* — Structure (server-rendered): write cookie + reload — */
  function readStruct() { return jget("kitStruct"); }
  /** @param {Record<string,unknown>} s */
  function structSer(s) {
    var p = [];
    if (s.shell) p.push("shell=" + s.shell);
    if (s.auf) p.push("auf=" + s.auf);
    if (s.stream) p.push("stream=" + s.stream);
    if (s.header) p.push("header=" + s.header);
    if (s.search) p.push("search=" + s.search);
    if (Array.isArray(s.rails)) p.push("rails=" + s.rails.join(","));
    return p.join("&");
  }
  _w.kitStructSet = function (obj, reload) {
    var s = readStruct();
    for (var k in obj) s[k] = obj[k];
    jset("kitStruct", s);
    document.cookie = "kitstruct=" + encodeURIComponent(structSer(s)) + ";path=/;max-age=31536000";
    if (reload) location.reload();
  };
  _w.kitChromeSet = function (o) {
    jset("kitChrome", o);
    document.cookie = "kitchrome=" + encodeURIComponent(JSON.stringify(o)) + ";path=/;max-age=31536000";
    location.reload();
  };

  // Apply a look: all skin parts, then optionally structure (triggers the reload — last!)
  _w.kitLook = function (idx, save) {
    var L = _w.KIT_LOOKS[idx];
    if (!L) return;
    _w.kitApplyFont("head", L.head, save);
    _w.kitApplyFont("body", L.body, save);
    if (L.palette != null) _w.kitPalette(L.palette, save);
    if (L.base) _w.kitBase(L.base, save);
    var k;
    for (k in L.type) _w.kitType(k, L.type[k], save);
    for (k in L.layout) _w.kitSetLayout(k, L.layout[k], save);
    for (k in L.card) _w.kitCard(k, L.card[k], save);
    if (L.colors) for (k in L.colors) _w.kitColor(k, L.colors[k], save);
    if (save) ssave("kitLook", String(idx));
    if (L.struct) _w.kitStructSet(L.struct, true);
  };

  /* — Early apply: saved settings (personal or global) before the paint — */
  try { var sh = gget("kitFontHead"); if (sh && sh !== _w.KIT_DEFAULT_HEAD) _w.kitApplyFont("head", sh, false); } catch (e) {}
  try { var sb = gget("kitFontBody"); if (sb && sb !== _w.KIT_DEFAULT_BODY) _w.kitApplyFont("body", sb, false); } catch (e) {}
  var C = jget("kitColors");
  for (var ck in C) D.style.setProperty(ck, C[ck]);
  if (C["--color-brand"]) D.style.setProperty("--btn-fg", buttonFg(String(C["--color-brand"])));
  // Auto-dark: respect the system scheme as long as neither personal nor global
  // colors have been chosen (display only, not persisted).
  var hasColors = false;
  for (var hc in C) { hasColors = true; break; }
  if (!hasColors) {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        var DB = _w.KIT_BASES.dark;
        for (var db in DB) D.style.setProperty(db, DB[db]);
      }
    } catch (e) {}
  }
  var L2 = jget("kitLayout");
  for (var lk in L2) _w.kitSetLayout(lk, L2[lk], false);
  var T2 = jget("kitType");
  for (var tk in T2) _w.kitType(tk, T2[tk], false);
  var K2 = jget("kitCard");
  for (var kk in K2) _w.kitCard(kk, K2[kk], false);
  try { if (localStorage.getItem("kitPanelOpen") === "1") D.classList.add("cz-on"); } catch (e) {}
})();
