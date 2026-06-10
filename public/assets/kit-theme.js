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

/* — Kuratierte Font-Auswahl (Bunny-Slugs). n=Name, s=Slug, c=Kategorie,
     g=generische Familie (Default sans-serif), w=verfügbare Gewichte — */
window.KIT_FONTS = [
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
window.KIT_FONT_CATS = ["Grotesk", "Humanistisch", "Geometrisch", "Condensed", "Neuer", "Serif Display", "Serif Text"];

/* — Geprüfte Schrift-Paare: h = Überschriften-Slug, b = Lauftext-Slug — */
window.KIT_PAIRS = [
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
window.KIT_DEFAULT_HEAD = "inter";
window.KIT_DEFAULT_BODY = "inter";

/* — Farbschemata (setzen ALLE Farb-Tokens konsistent) — */
window.KIT_PALETTES = [
  { n: "Steady",   v: { "--color-brand": "#137EC0", "--color-ink": "#291E38", "--color-ink-soft": "#6B6577", "--color-accent": "#FF7264", "--color-line": "#9A95A6", "--color-hairline": "#ECEAEF", "--color-bg": "#FFFFFF" } },
  { n: "Nacht",    v: { "--color-brand": "#4DA3E0", "--color-ink": "#ECEAF2", "--color-ink-soft": "#A6A2B5", "--color-accent": "#FF7264", "--color-line": "#5A5470", "--color-hairline": "#2A2636", "--color-bg": "#14121A" } },
  { n: "Wald",     v: { "--color-brand": "#1E7A4F", "--color-ink": "#1C2B22", "--color-ink-soft": "#5C6B62", "--color-accent": "#E0823C", "--color-line": "#9AA89F", "--color-hairline": "#E7EEE9", "--color-bg": "#FFFFFF" } },
  { n: "Bordeaux", v: { "--color-brand": "#8E2B43", "--color-ink": "#2B1A20", "--color-ink-soft": "#6E5860", "--color-accent": "#C99A2E", "--color-line": "#B39AA2", "--color-hairline": "#F0E8EB", "--color-bg": "#FFFFFF" } },
  { n: "Mono",     v: { "--color-brand": "#291E38", "--color-ink": "#1A1A1A", "--color-ink-soft": "#6B6B6B", "--color-accent": "#1A1A1A", "--color-line": "#B0B0B0", "--color-hairline": "#ECECEC", "--color-bg": "#FFFFFF" } },
];

/* — Hell/Dunkel-Basis (nur Flächen-/Text-Tokens, Brand/Accent bleiben) — */
window.KIT_BASES = {
  light: { "--color-bg": "#FFFFFF", "--color-ink": "#291E38", "--color-ink-soft": "#6B6577", "--color-line": "#9A95A6", "--color-hairline": "#ECEAEF" },
  dark:  { "--color-bg": "#14121A", "--color-ink": "#ECEAF2", "--color-ink-soft": "#A6A2B5", "--color-line": "#5A5470", "--color-hairline": "#2A2636" },
};

/* — Looks: ein Klick = geprüfter Gesamtstil (Fonts + Farben + Layout + Karten,
     optional struct → Server-Reload für die Seitenstruktur) — */
window.KIT_LOOKS = [
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
  function hexToRgb(h) {
    h = (h || "").replace("#", "");
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function relLuminance(h) {
    var c = hexToRgb(h).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrastRatio(a, b) {
    var L1 = relLuminance(a), L2 = relLuminance(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }
  // Button-Textfarbe: dunkel auf hellen Marken, weiß auf dunklen
  function buttonFg(brand) { return relLuminance(brand) > 0.42 ? "#16121d" : "#ffffff"; }
  window.KIT_RATIO = contrastRatio;
  window.KIT_RL = relLuminance;

  /* — Storage: localStorage zuerst, dann global veröffentlichte Basis (KIT_GLOBAL) — */
  function gget(k) {
    try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {}
    return (window.KIT_GLOBAL && window.KIT_GLOBAL[k] != null) ? window.KIT_GLOBAL[k] : null;
  }
  function jget(k) {
    var v = gget(k);
    if (v != null) { try { return JSON.parse(v); } catch (e) {} }
    return {};
  }
  function jset(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
  function ssave(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function setObj(store, k, v) { var o = jget(store); o[k] = v; jset(store, o); }

  /* — Fonts: Slug | Deskriptor | JSON-String → Deskriptor {s,n,g,w} auflösen + Bunny-CSS laden — */
  function titleCase(s) {
    var p = String(s || "").split("-");
    for (var i = 0; i < p.length; i++) p[i] = p[i].charAt(0).toUpperCase() + p[i].slice(1);
    return p.join(" ");
  }
  function bySlug(slug) {
    for (var i = 0; i < window.KIT_FONTS.length; i++) if (window.KIT_FONTS[i].s === slug) return window.KIT_FONTS[i];
    if (window.KIT_BUNNY && window.KIT_BUNNY[slug]) return window.KIT_BUNNY[slug]; // Katalog aus kit-panel.js
    return { s: slug, n: titleCase(slug), g: "sans-serif", w: "400,700" };
  }
  function resolveFont(x) {
    if (x && typeof x === "object" && x.s) return x;
    if (typeof x === "string") {
      if (x.charAt(0) === "{") { try { var o = JSON.parse(x); if (o && o.s) return o; } catch (e) {} }
      return bySlug(x);
    }
    return bySlug(window.KIT_DEFAULT_HEAD);
  }
  function loadFontCss(f) {
    if (loadedFonts[f.s]) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.bunny.net/css?family=" + f.s + ":" + (f.w || "400,500,600,700") + "&display=swap";
    document.head.appendChild(l);
    loadedFonts[f.s] = 1;
  }

  /* — Öffentliche Setter — */

  // role = "head" | "body"; x = Slug, Deskriptor oder gespeicherter JSON-String.
  // Persistiert den AUFGELÖSTEN Deskriptor, damit beliebige Bunny-Fonts den Reload überleben.
  window.kitApplyFont = function (role, x, save) {
    var f = resolveFont(x);
    loadFontCss(f);
    D.style.setProperty(role === "head" ? "--font-head" : "--font-body", '"' + f.n + '", ' + (f.g || "sans-serif"));
    if (save) {
      try { localStorage.setItem(role === "head" ? "kitFontHead" : "kitFontBody", JSON.stringify({ s: f.s, n: f.n, g: f.g || "sans-serif", w: f.w || "" })); } catch (e) {}
    }
  };

  // Einzelne Farbe setzen. Marke → Button-Textfarbe nachziehen; Hintergrund → Text-/
  // Linien-Töne automatisch auf hell/dunkel kontrastieren (lesbar bleiben).
  window.kitColor = function (name, val, save) {
    D.style.setProperty(name, val);
    if (name === "--color-brand") D.style.setProperty("--btn-fg", buttonFg(val));
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

  window.kitPalette = function (idx, save) {
    var p = window.KIT_PALETTES[idx];
    if (!p) return;
    var c = save ? jget("kitColors") : null;
    for (var k in p.v) { D.style.setProperty(k, p.v[k]); if (c) c[k] = p.v[k]; }
    D.style.setProperty("--btn-fg", buttonFg(p.v["--color-brand"]));
    if (save) { jset("kitColors", c); ssave("kitPalette", idx); }
  };

  window.kitBase = function (mode, save) {
    var b = window.KIT_BASES[mode];
    if (!b) return;
    var c = save ? jget("kitColors") : null;
    for (var k in b) { D.style.setProperty(k, b[k]); if (c) c[k] = b[k]; }
    if (save) { jset("kitColors", c); ssave("kitBase", mode); }
  };

  window.kitType = function (kind, val, save) {
    if (kind === "size") D.style.setProperty("--fs", val === "klein" ? "0.92" : val === "gross" ? "1.12" : "1");
    else if (kind === "lead") D.style.setProperty("--lh-body", val === "eng" ? "1.4" : val === "luftig" ? "1.75" : "1.55");
    else if (kind === "track") D.style.setProperty("--track-head", val === "eng" ? "-.04em" : val === "weit" ? ".06em" : "-.01em");
    else if (kind === "case") D.style.setProperty("--case-head", val === "gross" ? "uppercase" : val === "title" ? "capitalize" : "none");
    else if (kind === "align") D.style.setProperty("--align-head", val === "zentriert" ? "center" : "left");
    if (save) setObj("kitType", kind, val);
  };

  window.kitCard = function (kind, val, save) {
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

  window.kitSetLayout = function (kind, val, save) {
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
  function structSer(s) {
    var p = [];
    if (s.shell) p.push("shell=" + s.shell);
    if (s.auf) p.push("auf=" + s.auf);
    if (s.stream) p.push("stream=" + s.stream);
    if (s.header) p.push("header=" + s.header);
    if (s.search) p.push("search=" + s.search);
    if (s.rails) p.push("rails=" + s.rails.join(","));
    return p.join("&");
  }
  window.kitStructSet = function (obj, reload) {
    var s = readStruct();
    for (var k in obj) s[k] = obj[k];
    jset("kitStruct", s);
    document.cookie = "kitstruct=" + encodeURIComponent(structSer(s)) + ";path=/;max-age=31536000";
    if (reload) location.reload();
  };
  window.kitChromeSet = function (o) {
    jset("kitChrome", o);
    document.cookie = "kitchrome=" + encodeURIComponent(JSON.stringify(o)) + ";path=/;max-age=31536000";
    location.reload();
  };

  // Look anwenden: alle Skin-Teile, dann optional Struktur (löst den Reload aus — zuletzt!)
  window.kitLook = function (idx, save) {
    var L = window.KIT_LOOKS[idx];
    if (!L) return;
    window.kitApplyFont("head", L.head, save);
    window.kitApplyFont("body", L.body, save);
    if (L.palette != null) window.kitPalette(L.palette, save);
    if (L.base) window.kitBase(L.base, save);
    var k;
    for (k in L.type) window.kitType(k, L.type[k], save);
    for (k in L.layout) window.kitSetLayout(k, L.layout[k], save);
    for (k in L.card) window.kitCard(k, L.card[k], save);
    if (L.colors) for (k in L.colors) window.kitColor(k, L.colors[k], save);
    if (save) ssave("kitLook", idx);
    if (L.struct) window.kitStructSet(L.struct, true);
  };

  /* — Frühanwendung: gespeicherte Einstellungen (persönlich oder global) vor dem Paint — */
  try { var sh = gget("kitFontHead"); if (sh && sh !== window.KIT_DEFAULT_HEAD) window.kitApplyFont("head", sh, false); } catch (e) {}
  try { var sb = gget("kitFontBody"); if (sb && sb !== window.KIT_DEFAULT_BODY) window.kitApplyFont("body", sb, false); } catch (e) {}
  var C = jget("kitColors");
  for (var ck in C) D.style.setProperty(ck, C[ck]);
  if (C["--color-brand"]) D.style.setProperty("--btn-fg", buttonFg(C["--color-brand"]));
  // Auto-Dark: System-Schema respektieren, solange weder persönlich noch global Farben
  // gewählt wurden (nur Anzeige, wird nicht gespeichert).
  var hasColors = false;
  for (var hc in C) { hasColors = true; break; }
  if (!hasColors) {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        var DB = window.KIT_BASES.dark;
        for (var db in DB) D.style.setProperty(db, DB[db]);
      }
    } catch (e) {}
  }
  var L2 = jget("kitLayout");
  for (var lk in L2) window.kitSetLayout(lk, L2[lk], false);
  var T2 = jget("kitType");
  for (var tk in T2) window.kitType(tk, T2[tk], false);
  var K2 = jget("kitCard");
  for (var kk in K2) window.kitCard(kk, K2[kk], false);
  try { if (localStorage.getItem("kitPanelOpen") === "1") D.classList.add("cz-on"); } catch (e) {}
})();
