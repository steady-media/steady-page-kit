/* catalog.js — fonts, token scales, panel schema, looks and i18n.
 * The customizer is rendered from NL.CONTROLS, the page-kit way (data-driven).
 * Labels are i18n KEYS; token/enum values stay verbatim (page-kit discipline). */
window.NL = window.NL || {};

/* ---- Fonts ----
 * Three groups:
 *   safe   — system fonts that render in EVERY client (no fallback warning)
 *   web    — Fontshare catalog copied from the page kit + Steady's self-hosted faces;
 *            these load in Apple Mail etc. but FALL BACK in Gmail/Outlook/Yahoo.
 * Each font carries the email `stack` (what goes in the inlined HTML), a `fallback`
 * label for the honesty hint, and (Fontshare only) a `fontshare` slug to load. */
var GEN = {
  "sans-serif": ["'Helvetica Neue', Arial, sans-serif", "Helvetica"],
  "serif": ["Georgia, 'Times New Roman', serif", "Georgia"],
  "cursive": ["'Snell Roundhand', 'Comic Sans MS', cursive", "a system script"],
  "monospace": ["'Courier New', Courier, monospace", "Courier"],
};
var SERIF_DISPLAY = { boska: 1, melodrama: 1, stardom: 1, chubbo: 1, aktura: 1, bevellier: 1 };
function genFor(c, s) {
  if (c === "Serif" || c === "Slab") return "serif";
  if (c === "Script") return "cursive";
  if (c === "Mono") return "monospace";
  if (c === "Display") return SERIF_DISPLAY[s] ? "serif" : "sans-serif";
  return "sans-serif";
}
/* Full Fontshare catalog from the page kit (name, slug, category). */
var FS = [
  ["Switzer", "switzer", "Sans"], ["General Sans", "general-sans", "Sans"], ["Satoshi", "satoshi", "Sans"],
  ["Supreme", "supreme", "Sans"], ["Synonym", "synonym", "Sans"], ["Author", "author", "Sans"],
  ["Clash Grotesk", "clash-grotesk", "Sans"], ["Cabinet Grotesk", "cabinet-grotesk", "Sans"], ["Chillax", "chillax", "Sans"],
  ["Technor", "technor", "Sans"], ["Alpino", "alpino", "Sans"], ["Amulya", "amulya", "Sans"], ["Excon", "excon", "Sans"],
  ["Pally", "pally", "Sans"], ["Quilon", "quilon", "Sans"], ["Plein", "plein", "Sans"], ["RX100", "rx-100", "Sans"],
  ["Bespoke Sans", "bespoke-sans", "Sans"], ["Pilcrow Rounded", "pilcrow-rounded", "Sans"], ["Pramukh Rounded", "pramukh-rounded", "Sans"],
  ["Sentient", "sentient", "Serif"], ["Gambetta", "gambetta", "Serif"], ["Gambarino", "gambarino", "Serif"],
  ["Rowan", "rowan", "Serif"], ["Zodiak", "zodiak", "Serif"], ["Erode", "erode", "Serif"], ["Recia", "recia", "Serif"],
  ["Neco", "neco", "Serif"], ["Bonny", "bonny", "Serif"], ["Bespoke Serif", "bespoke-serif", "Serif"], ["Ranade", "ranade", "Serif"],
  ["Bespoke Slab", "bespoke-slab", "Slab"], ["Hoover", "hoover", "Slab"], ["Paquito", "paquito", "Slab"], ["Trench Slab", "trench-slab", "Slab"],
  ["Clash Display", "clash-display", "Display"], ["Tanker", "tanker", "Display"], ["Expose", "expose", "Display"],
  ["New Title", "new-title", "Display"], ["Panchang", "panchang", "Display"], ["Bespoke Stencil", "bespoke-stencil", "Display"],
  ["Kihim", "kihim", "Display"], ["Striper", "striper", "Display"], ["Boxing", "boxing", "Display"], ["Kohinoor Zerone", "kohinoor-zerone", "Display"],
  ["Array", "array", "Display"], ["Kola", "kola", "Display"], ["Nippo", "nippo", "Display"], ["Styro", "styro", "Display"],
  ["Segment", "segment", "Display"], ["Zina", "zina", "Display"], ["Boska", "boska", "Display"], ["Melodrama", "melodrama", "Display"],
  ["Stardom", "stardom", "Display"], ["Chubbo", "chubbo", "Display"], ["Aktura", "aktura", "Display"], ["Bevellier", "bevellier", "Display"],
  ["Comico", "comico", "Script"], ["Britney", "britney", "Script"], ["Pencerio", "pencerio", "Script"],
  ["Telma", "telma", "Script"], ["Rosaline", "rosaline", "Script"], ["Sharpie", "sharpie", "Script"], ["Tabular", "tabular", "Mono"],
];
var SYS = [
  { id: "georgia", n: "Georgia", s: "georgia", c: "System", g: "serif", group: "safe", stack: "Georgia, 'Times New Roman', serif" },
  { id: "times", n: "Times New Roman", s: "times", c: "System", g: "serif", group: "safe", stack: "'Times New Roman', Times, serif" },
  { id: "helvetica", n: "Helvetica / Arial", s: "helvetica", c: "System", g: "sans-serif", group: "safe", stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { id: "verdana", n: "Verdana", s: "verdana", c: "System", g: "sans-serif", group: "safe", stack: "Verdana, Geneva, sans-serif" },
  { id: "trebuchet", n: "Trebuchet MS", s: "trebuchet", c: "System", g: "sans-serif", group: "safe", stack: "'Trebuchet MS', Helvetica, sans-serif" },
  { id: "courier", n: "Courier", s: "courier", c: "System", g: "monospace", group: "safe", stack: "'Courier New', Courier, monospace" },
];
var STEADY = [
  { id: "calluna", n: "Calluna", s: "calluna", c: "Serif", g: "serif", group: "web", selfHosted: true, stack: "Calluna, Georgia, 'Times New Roman', serif", fallback: "Georgia" },
  { id: "circular", n: "Circular Std", s: "circular", c: "Sans", g: "sans-serif", group: "web", selfHosted: true, stack: "CircularStd, 'Helvetica Neue', Helvetica, Arial, sans-serif", fallback: "Helvetica" },
];
NL.FONTS = SYS.concat(STEADY).concat(FS.map(function (t) {
  var g = genFor(t[2], t[1]);
  return { id: t[1], n: t[0], s: t[1], c: t[2], g: g, group: "web", fontshare: t[1], stack: "'" + t[0] + "', " + GEN[g][0], fallback: GEN[g][1] };
}));
NL.fontById = function (id) {
  for (var i = 0; i < NL.FONTS.length; i++) if (NL.FONTS[i].id === id) return NL.FONTS[i];
  return NL.FONTS[0];
};
/* Role filter, copied from the kit: Display/Script + a research override list are
 * heading-only; a few quiet faces are body-only; the rest do both. */
NL.HEADLINE_ONLY = { technor: 1, excon: 1, quilon: 1, "rx-100": 1, gambarino: 1, zodiak: 1, bonny: 1, hoover: 1, paquito: 1 };
NL.BODY_ONLY = { synonym: 1, author: 1, recia: 1 };
NL.fontRole = function (f) {
  if (NL.BODY_ONLY[f.s]) return "body";
  if (NL.HEADLINE_ONLY[f.s] || f.c === "Display" || f.c === "Script") return "head";
  return "both";
};
NL.roleOk = function (f, role) { var r = NL.fontRole(f); return role === "head" ? r !== "body" : r !== "head"; };

NL.SIZES     = { small: "17px", standard: "19px", large: "22px" };
NL.LEADING   = { tight: "132%", normal: "147%", airy: "165%" };
NL.RADIUS    = { square: "0", rounded: "6px", pill: "999px" };
NL.DENSITY   = { compact: "20px", cozy: "30px", roomy: "46px" };
NL.WEIGHT    = { normal: "400", medium: "600", bold: "700" };
NL.IMGRADIUS = { square: "0", rounded: "10px" };
NL.LINK      = { underline: { deco: "underline", weight: "" }, plain: { deco: "none", weight: "" }, bold: { deco: "underline", weight: "700" } };

/* Defaults reproduce the real Steady newsletter exactly. */
NL.DEFAULTS = {
  accent: "#ff7264", extendAccent: false, textColor: "#291e38", bgColor: "#ffffff", dividerColor: "#e7e7e7",
  headingFont: "circular", headingWeight: "bold", bodyFont: "calluna", size: "standard", leading: "normal", linkStyle: "underline",
  buttonStyle: "filled", corner: "square", imageCorner: "square",
  density: "cozy", header: "left", headerBg: "#ffffff", banner: false,
  memberCta: false, paywallTeaser: false,
};

/* One-click looks. */
NL.LOOKS = [
  { id: "steady",    label: "Steady",    d: "The default", set: {} },
  { id: "editorial", label: "Editorial", d: "Serif & calm",
    set: { bodyFont: "sentient", headingFont: "zodiak", accent: "#8e2b43", size: "large", leading: "airy", buttonStyle: "outline", linkStyle: "bold", extendAccent: true } },
  { id: "modern",    label: "Modern",    d: "Clean sans",
    set: { bodyFont: "switzer", headingFont: "switzer", accent: "#137ec0", corner: "rounded", imageCorner: "rounded", extendAccent: true } },
  { id: "bold",      label: "Bold",      d: "Loud display",
    set: { bodyFont: "satoshi", headingFont: "clash-display", headingWeight: "bold", accent: "#1e7a4f", corner: "pill", size: "large", extendAccent: true } },
  { id: "safe",      label: "Inbox-safe", d: "No webfonts",
    set: { bodyFont: "georgia", headingFont: "helvetica", accent: "#ff7264", corner: "rounded", extendAccent: true } },
];

/* Panel schema — label/sub/option labels are i18n keys. Headline first, then body. */
NL.CONTROLS = [
  { title: "colour", rows: [
    { key: "accent",       type: "color", label: "accent", sub: "brandSub" },
    { key: "extendAccent", type: "check", label: "extend", sub: "proposed" },
    { key: "textColor",    type: "color", label: "text" },
    { key: "bgColor",      type: "color", label: "background" },
    { key: "dividerColor", type: "color", label: "divider" },
  ]},
  { title: "type", rows: [
    { key: "headingFont",   type: "font", label: "headingFont", role: "head" },
    { key: "headingWeight", type: "seg",  label: "headingWeight", options: [["normal", "wNormal"], ["medium", "wMedium"], ["bold", "wBold"]] },
    { key: "bodyFont",      type: "font", label: "bodyFont", role: "body" },
    { key: "size",          type: "seg",  label: "size",    options: [["small", "s"], ["standard", "m"], ["large", "l"]] },
    { key: "leading",       type: "seg",  label: "leading", options: [["tight", "tight"], ["normal", "normal"], ["airy", "airy"]] },
    { key: "linkStyle",     type: "seg",  label: "linkStyle", options: [["underline", "lUnderline"], ["plain", "lPlain"], ["bold", "lBold"]] },
  ]},
  { title: "buttons", rows: [
    { key: "buttonStyle", type: "seg", label: "buttonStyle", options: [["filled", "bFilled"], ["outline", "bOutline"]] },
    { key: "corner",      type: "seg", label: "corner", options: [["square", "square"], ["rounded", "rounded"], ["pill", "pill"]], fallbackNote: "outlookSquare" },
  ]},
  { title: "layout", rows: [
    { key: "imageCorner", type: "seg",   label: "imageCorner", options: [["square", "square"], ["rounded", "rounded"]] },
    { key: "density",     type: "seg",   label: "spacing", options: [["compact", "compact"], ["cozy", "cozy"], ["roomy", "roomy"]] },
    { key: "header",      type: "seg",   label: "header",  options: [["left", "left"], ["center", "center"]] },
    { key: "headerBg",    type: "color", label: "headerBg" },
    { key: "banner",      type: "check", label: "banner" },
  ]},
  { title: "membership", rows: [
    { key: "memberCta",     type: "check", label: "memberCta", sub: "steadyMembers" },
    { key: "paywallTeaser", type: "check", label: "paywallTeaser" },
  ]},
];

/* Localization data (user-facing). Token/enum values above stay verbatim. */
NL.I18N = {
  en: {
    title: "Newsletter style",
    colour: "Colour", type: "Type", buttons: "Buttons", layout: "Layout", membership: "Membership", looks: "Looks",
    accent: "Accent", brandSub: "publication.brand_color", extend: "Apply accent to links & button", proposed: "proposed",
    text: "Text", background: "Background", divider: "Divider",
    headingFont: "Headline font", bodyFont: "Body font", headingWeight: "Headline weight",
    size: "Body size", leading: "Line height", linkStyle: "Link style",
    buttonStyle: "Button style", corner: "Button corners", imageCorner: "Image corners",
    spacing: "Spacing", header: "Header", headerBg: "Header background", banner: "Banner image",
    memberCta: "Membership call-to-action", steadyMembers: "Steady memberships", paywallTeaser: "Paywall teaser",
    s: "S", m: "M", l: "L", tight: "Tight", normal: "Normal", airy: "Airy",
    wNormal: "Normal", wMedium: "Medium", wBold: "Bold",
    lUnderline: "Underline", lPlain: "Plain", lBold: "Bold", bFilled: "Filled", bOutline: "Outline",
    square: "Square", rounded: "Rounded", pill: "Pill", compact: "Compact", cozy: "Cozy", roomy: "Roomy", left: "Left", center: "Centered",
    renders: "Renders in every client", fallsback: "Falls back to {f} in Gmail/Outlook", outlookSquare: "Outlook always squares corners",
    searchFonts: "Search fonts…",
    compare: "Compare", designed: "Designed", mostInboxes: "Most inboxes",
    whatYouDesign: "What you design", whatMost: "What most inboxes show",
    contrastText: "Text vs background contrast is {r}:1 — aim for 4.5:1.",
    contrastLink: "Link colour vs background is {r}:1 — links may be hard to read.",
    desktop: "Desktop", mobile: "Mobile", dark: "Dark inbox", reset: "Reset", off: "Off", on: "On",
    darkNote: "Apple Mail keeps your light background; Outlook.com may force-invert. This template has no dark variant yet.",
  },
  de: {
    title: "Newsletter-Stil",
    colour: "Farbe", type: "Schrift", buttons: "Buttons", layout: "Layout", membership: "Mitgliedschaft", looks: "Stile",
    accent: "Akzent", brandSub: "publication.brand_color", extend: "Akzent auf Links & Button anwenden", proposed: "Vorschlag",
    text: "Text", background: "Hintergrund", divider: "Trennlinie",
    headingFont: "Überschriften-Schrift", bodyFont: "Fließtext-Schrift", headingWeight: "Überschrift-Stärke",
    size: "Textgröße", leading: "Zeilenhöhe", linkStyle: "Link-Stil",
    buttonStyle: "Button-Stil", corner: "Button-Ecken", imageCorner: "Bild-Ecken",
    spacing: "Abstände", header: "Kopf", headerBg: "Kopf-Hintergrund", banner: "Banner-Bild",
    memberCta: "Mitglieds-Button", steadyMembers: "Steady-Mitgliedschaften", paywallTeaser: "Paywall-Teaser",
    s: "S", m: "M", l: "L", tight: "Eng", normal: "Normal", airy: "Luftig",
    wNormal: "Normal", wMedium: "Mittel", wBold: "Fett",
    lUnderline: "Unterstrichen", lPlain: "Schlicht", lBold: "Fett", bFilled: "Gefüllt", bOutline: "Umrandet",
    square: "Eckig", rounded: "Rund", pill: "Pille", compact: "Kompakt", cozy: "Mittel", roomy: "Weit", left: "Links", center: "Zentriert",
    renders: "Wird überall angezeigt", fallsback: "Fällt in Gmail/Outlook auf {f} zurück", outlookSquare: "Outlook macht Ecken immer eckig",
    searchFonts: "Schriften suchen…",
    compare: "Vergleich", designed: "Gestaltet", mostInboxes: "Meiste Postfächer",
    whatYouDesign: "Deine Gestaltung", whatMost: "Was die meisten Postfächer zeigen",
    contrastText: "Kontrast Text/Hintergrund ist {r}:1 — Ziel sind 4.5:1.",
    contrastLink: "Kontrast Linkfarbe/Hintergrund ist {r}:1 — Links evtl. schwer lesbar.",
    desktop: "Desktop", mobile: "Mobil", dark: "Dunkles Postfach", reset: "Zurücksetzen", off: "Aus", on: "An",
    darkNote: "Apple Mail behält deinen hellen Hintergrund; Outlook.com invertiert evtl. Diese Vorlage hat noch keine dunkle Variante.",
  },
};
