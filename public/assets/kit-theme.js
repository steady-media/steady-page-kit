// @ts-check
/* kit-theme.js — früher Theme-Motor des Kits.
 *
 * Läuft BLOCKIEREND im <head>, damit gespeicherte Einstellungen vor dem ersten
 * Paint anliegen (kein Theme-Flackern). Datenquellen, in dieser Präzedenz:
 *   1. localStorage        — persönliche Einstellungen dieses Browsers (gewinnen)
 *   2. window.KIT_GLOBAL   — global veröffentlichte Einstellungen (Server-injiziert aus KV)
 *
 * Öffentliche API (genutzt von kit-panel.js):
 *   Kataloge : KIT_FONTS, KIT_FONT_CATS, KIT_PAIRS, KIT_PALETTES, KIT_BASES, KIT_LOOKS
 *   Setter   : kitApplyFont, kitColor, kitPalette, kitBase, kitType, kitCard,
 *              kitSetLayout, kitLook, kitStructSet, kitChromeSet
 *   Helfer   : KIT_RATIO (WCAG-Kontrast), KIT_RL (relative Luminanz)
 *
 * Skin-Setter wirken live (CSS-Variablen/Klassen auf <html>); Struktur-Setter
 * (kitStructSet/kitChromeSet) schreiben einen Cookie und laden die Seite neu,
 * weil der Server die Struktur rendert.
 */

/**
 * @typedef {{ n: string, s: string, c: string, g?: string, w?: string }} KitFont
 * @typedef {{ n: string, h: string, b: string }} KitFontPair
 * @typedef {{ n: string, v: Record<string,string> }} KitPalette
 * @typedef {{ n: string, d?: string, head: string, body: string, base: string, palette?: number, type: Record<string,string>, layout: Record<string,string>, card: Record<string,string>, colors?: Record<string,string>, struct?: Record<string,string|string[]> }} KitLook
 */

/**
 * Globale window-Erweiterungen des Kits (Kataloge, Setter, Helfer).
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

// Typ-Erweiterung für window im Browser-Kontext (nur JSDoc, kein Laufzeit-Effekt).
/** @type {Window & typeof globalThis & KitWindowExtensions} */
var _w = /** @type {any} */ (window);

/* — Kuratierte Font-Auswahl (Bunny-Slugs). n=Name, s=Slug, c=Kategorie,
     g=generische Familie (Default sans-serif), w=verfügbare Gewichte — */
_w.KIT_FONTS = [
  { n: "Inter", s: "inter", c: "Grotesk" },
  { n: "Archivo", s: "archivo", c: "Grotesk" },
  { n: "Archivo Narrow", s: "archivo-narrow", c: "Grotesk" },
  { n: "Archivo Black", s: "archivo-black", c: "Grotesk", w: "400,700,900" },
  { n: "Schibsted Grotesk", s: "schibsted-grotesk", c: "Grotesk" },
  { n: "Bricolage Grotesque", s: "bricolage-grotesque", c: "Grotesk" },
  { n: "Libre Franklin", s: "libre-franklin", c: "Grotesk" },
  { n: "Space Grotesk", s: "space-grotesk", c: "Grotesk" },
  { n: "Work Sans", s: "work-sans", c: "Grotesk" },
  { n: "Familjen Grotesk", s: "familjen-grotesk", c: "Grotesk" },
  { n: "Hanken Grotesk", s: "hanken-grotesk", c: "Grotesk" },
  { n: "Source Sans 3", s: "source-sans-3", c: "Humanistisch" },
  { n: "Fira Sans", s: "fira-sans", c: "Humanistisch" },
  { n: "Public Sans", s: "public-sans", c: "Humanistisch" },
  { n: "Mulish", s: "mulish", c: "Humanistisch" },
  { n: "Montserrat", s: "montserrat", c: "Geometrisch" },
  { n: "Poppins", s: "poppins", c: "Geometrisch" },
  { n: "Sora", s: "sora", c: "Geometrisch" },
  { n: "Lexend", s: "lexend", c: "Geometrisch" },
  { n: "Oswald", s: "oswald", c: "Condensed" },
  { n: "Barlow", s: "barlow", c: "Condensed" },
  { n: "Barlow Condensed", s: "barlow-condensed", c: "Condensed" },
  { n: "Barlow Semi Condensed", s: "barlow-semi-condensed", c: "Condensed" },
  { n: "Saira", s: "saira", c: "Condensed" },
  { n: "Saira Condensed", s: "saira-condensed", c: "Condensed" },
  { n: "Saira Semi Condensed", s: "saira-semi-condensed", c: "Condensed" },
  { n: "Geist", s: "geist", c: "Neuer" },
  { n: "Geist Mono", s: "geist-mono", g: "monospace", c: "Neuer" },
  { n: "Instrument Sans", s: "instrument-sans", c: "Neuer" },
  { n: "Onest", s: "onest", c: "Neuer" },
  { n: "Figtree", s: "figtree", c: "Neuer" },
  { n: "Albert Sans", s: "albert-sans", c: "Neuer" },
  { n: "Playfair Display", s: "playfair-display", g: "serif", c: "Serif Display" },
  { n: "Fraunces", s: "fraunces", g: "serif", c: "Serif Display" },
  { n: "DM Serif Display", s: "dm-serif-display", g: "serif", c: "Serif Display", w: "400" },
  { n: "Cormorant Garamond", s: "cormorant-garamond", g: "serif", c: "Serif Display" },
  { n: "Instrument Serif", s: "instrument-serif", g: "serif", c: "Serif Display", w: "400" },
  { n: "Lora", s: "lora", g: "serif", c: "Serif Text" },
  { n: "Source Serif 4", s: "source-serif-4", g: "serif", c: "Serif Text" },
  { n: "Newsreader", s: "newsreader", g: "serif", c: "Serif Text" },
  { n: "Spectral", s: "spectral", g: "serif", c: "Serif Text" },
  { n: "Libre Baskerville", s: "libre-baskerville", g: "serif", c: "Serif Text", w: "400,700" },
  { n: "Crimson Pro", s: "crimson-pro", g: "serif", c: "Serif Text" },
  { n: "Merriweather", s: "merriweather", g: "serif", c: "Serif Text", w: "400,700,900" },
  { n: "Literata", s: "literata", g: "serif", c: "Serif Text" },
  { n: "Bitter", s: "bitter", g: "serif", c: "Serif Text" },
  { n: "PT Serif", s: "pt-serif", g: "serif", c: "Serif Text", w: "400,700" },
];
_w.KIT_FONT_CATS = ["Grotesk", "Humanistisch", "Geometrisch", "Condensed", "Neuer", "Serif Display", "Serif Text"];

/* — Geprüfte Schrift-Paare: h = Überschriften-Slug, b = Lauftext-Slug — */
_w.KIT_PAIRS = [
  { n: "Nordisch editorial", h: "schibsted-grotesk", b: "source-sans-3" },
  { n: "Zeitungsklassiker", h: "libre-franklin", b: "source-sans-3" },
  { n: "Headline-Werkstatt", h: "archivo", b: "inter" },
  { n: "Display mit Charakter", h: "bricolage-grotesque", b: "inter" },
  { n: "Geometrisch & sauber", h: "space-grotesk", b: "work-sans" },
  { n: "Masthead / Condensed", h: "oswald", b: "public-sans" },
  { n: "Tech-editorial", h: "geist", b: "inter" },
  { n: "Eine Familie", h: "archivo-black", b: "archivo" },
  { n: "Warm & lesbar", h: "familjen-grotesk", b: "mulish" },
  { n: "Hochkontrast-Magazin", h: "playfair-display", b: "source-serif-4" },
  { n: "Serife trifft Grotesk", h: "fraunces", b: "inter" },
  { n: "Buch / Longform", h: "cormorant-garamond", b: "crimson-pro" },
  { n: "News-Longform", h: "libre-franklin", b: "newsreader" },
  { n: "Instrument-Duo", h: "instrument-serif", b: "instrument-sans" },
  { n: "Redaktion klassisch", h: "dm-serif-display", b: "lora" },
];
_w.KIT_DEFAULT_HEAD = "inter";
_w.KIT_DEFAULT_BODY = "inter";

/* — Farbschemata (setzen ALLE Farb-Tokens konsistent) — */
_w.KIT_PALETTES = [
  { n: "Steady",   v: { "--color-brand": "#137EC0", "--color-ink": "#291E38", "--color-ink-soft": "#6B6577", "--color-accent": "#FF7264", "--color-line": "#9A95A6", "--color-hairline": "#ECEAEF", "--color-bg": "#FFFFFF" } },
  { n: "Nacht",    v: { "--color-brand": "#4DA3E0", "--color-ink": "#ECEAF2", "--color-ink-soft": "#A6A2B5", "--color-accent": "#FF7264", "--color-line": "#5A5470", "--color-hairline": "#2A2636", "--color-bg": "#14121A" } },
  { n: "Wald",     v: { "--color-brand": "#1E7A4F", "--color-ink": "#1C2B22", "--color-ink-soft": "#5C6B62", "--color-accent": "#E0823C", "--color-line": "#9AA89F", "--color-hairline": "#E7EEE9", "--color-bg": "#FFFFFF" } },
  { n: "Bordeaux", v: { "--color-brand": "#8E2B43", "--color-ink": "#2B1A20", "--color-ink-soft": "#6E5860", "--color-accent": "#C99A2E", "--color-line": "#B39AA2", "--color-hairline": "#F0E8EB", "--color-bg": "#FFFFFF" } },
  { n: "Mono",     v: { "--color-brand": "#291E38", "--color-ink": "#1A1A1A", "--color-ink-soft": "#6B6B6B", "--color-accent": "#1A1A1A", "--color-line": "#B0B0B0", "--color-hairline": "#ECECEC", "--color-bg": "#FFFFFF" } },
];

/* — Hell/Dunkel-Basis (nur Flächen-/Text-Tokens, Brand/Accent bleiben) — */
_w.KIT_BASES = {
  light: { "--color-bg": "#FFFFFF", "--color-ink": "#291E38", "--color-ink-soft": "#6B6577", "--color-line": "#9A95A6", "--color-hairline": "#ECEAEF" },
  dark:  { "--color-bg": "#14121A", "--color-ink": "#ECEAF2", "--color-ink-soft": "#A6A2B5", "--color-line": "#5A5470", "--color-hairline": "#2A2636" },
};

/* — Looks: ein Klick = geprüfter Gesamtstil (Fonts + Farben + Layout + Karten,
     optional struct → Server-Reload für die Seitenstruktur) — */
_w.KIT_LOOKS = [
  { n: "Steady", d: "Klar & journalistisch", head: "inter", body: "inter", base: "light", palette: 0,
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "classic", surface: "flat", image: "farbe", aspect: "16:9" } },
  { n: "Magazin", d: "Serifen & Kontrast", head: "playfair-display", body: "source-serif-4", base: "light",
    type: { size: "gross", lead: "normal", track: "eng", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "classic", surface: "flat", image: "farbe", aspect: "4:3" } },
  { n: "Minimal", d: "Ruhig, viel Weissraum", head: "inter", body: "inter", base: "light", palette: 4,
    type: { size: "standard", lead: "luftig", track: "normal", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "grosszuegig", hero: "split", width: "schmal" },
    card: { style: "text", surface: "flat", image: "farbe", aspect: "16:9" } },
  { n: "Bold", d: "Laut & Grossbuchstaben", head: "archivo-black", body: "archivo", base: "light", palette: 0,
    type: { size: "gross", lead: "normal", track: "eng", case: "gross", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "overlay", surface: "flat", image: "farbe", aspect: "16:9" } },
  { n: "Klassik", d: "Elegant & zentriert", head: "fraunces", body: "lora", base: "light", palette: 3,
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "zentriert" },
    layout: { corner: "rund", dens: "komfortabel", hero: "center", width: "standard" },
    card: { style: "classic", surface: "soft", image: "graustufen", aspect: "4:3" } },
  { n: "Nacht", d: "Dark Mode", head: "inter", body: "inter", base: "dark", palette: 1,
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    layout: { corner: "rund", dens: "komfortabel", hero: "split", width: "standard" },
    card: { style: "classic", surface: "outline", image: "farbe", aspect: "16:9" } },
  { n: "Magazin-Portal", d: "3-spaltig, rubriziert", head: "mulish", body: "source-serif-4", base: "light",
    type: { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    layout: { corner: "eckig", dens: "komfortabel", hero: "split", width: "breit", cols: "4", nav: "figma" },
    card: { style: "classic", surface: "flat", image: "farbe", aspect: "16:9" },
    colors: { "--color-brand": "#954FCF", "--color-accent": "#954FCF" },
    struct: { shell: "portal", auf: "gross", stream: "rubrik", rails: ["neueste", "meist", "themen"] } },
];

(function () {
  var D = document.documentElement;
  var loadedFonts = { inter: 1 }; // Inter kommt schon als <link> im <head>

  /* — Farb-Helfer (WCAG) — */
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
  // Button-Textfarbe: dunkel auf hellen Marken, weiß auf dunklen
  /** @param {string} brand */
  function buttonFg(brand) { return relLuminance(brand) > 0.42 ? "#16121d" : "#ffffff"; }
  _w.KIT_RATIO = contrastRatio;
  _w.KIT_RL = relLuminance;

  /* — Storage: localStorage zuerst, dann global veröffentlichte Basis (KIT_GLOBAL) — */
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

  /* — Fonts: Slug | Deskriptor | JSON-String → Deskriptor {s,n,g,w} auflösen + Bunny-CSS laden — */
  /** @param {string} s */
  function titleCase(s) {
    var p = String(s || "").split("-");
    for (var i = 0; i < p.length; i++) p[i] = p[i].charAt(0).toUpperCase() + p[i].slice(1);
    return p.join(" ");
  }
  /** @param {string} slug @returns {KitFont} */
  function bySlug(slug) {
    for (var i = 0; i < _w.KIT_FONTS.length; i++) if (_w.KIT_FONTS[i].s === slug) return _w.KIT_FONTS[i];
    if (_w.KIT_BUNNY && _w.KIT_BUNNY[slug]) return _w.KIT_BUNNY[slug]; // Katalog aus kit-panel.js
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
    l.href = "https://fonts.bunny.net/css?family=" + f.s + ":" + (f.w || "400,500,600,700") + "&display=swap";
    document.head.appendChild(l);
    /** @type {Record<string,unknown>} */ (loadedFonts)[f.s] = 1;
  }

  /* — Öffentliche Setter — */

  // role = "head" | "body"; x = Slug, Deskriptor oder gespeicherter JSON-String.
  // Persistiert den AUFGELÖSTEN Deskriptor, damit beliebige Bunny-Fonts den Reload überleben.
  _w.kitApplyFont = function (role, x, save) {
    var f = resolveFont(x);
    loadFontCss(f);
    D.style.setProperty(role === "head" ? "--font-head" : "--font-body", '"' + f.n + '", ' + (f.g || "sans-serif"));
    if (save) {
      try { localStorage.setItem(role === "head" ? "kitFontHead" : "kitFontBody", JSON.stringify({ s: f.s, n: f.n, g: f.g || "sans-serif", w: f.w || "" })); } catch (e) {}
    }
  };

  // Einzelne Farbe setzen. Marke → Button-Textfarbe nachziehen; Hintergrund → Text-/
  // Linien-Töne automatisch auf hell/dunkel kontrastieren (lesbar bleiben).
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

  /* — Struktur (Server-gerendert): Cookie schreiben + Reload — */
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

  // Look anwenden: alle Skin-Teile, dann optional Struktur (löst den Reload aus — zuletzt!)
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

  /* — Frühanwendung: gespeicherte Einstellungen (persönlich oder global) vor dem Paint — */
  try { var sh = gget("kitFontHead"); if (sh && sh !== _w.KIT_DEFAULT_HEAD) _w.kitApplyFont("head", sh, false); } catch (e) {}
  try { var sb = gget("kitFontBody"); if (sb && sb !== _w.KIT_DEFAULT_BODY) _w.kitApplyFont("body", sb, false); } catch (e) {}
  var C = jget("kitColors");
  for (var ck in C) D.style.setProperty(ck, C[ck]);
  if (C["--color-brand"]) D.style.setProperty("--btn-fg", buttonFg(String(C["--color-brand"])));
  // Auto-Dark: System-Schema respektieren, solange weder persönlich noch global Farben
  // gewählt wurden (nur Anzeige, wird nicht gespeichert).
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
