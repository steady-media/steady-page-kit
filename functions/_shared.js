// _shared.js — Steady-Feed → HTML-Render (Steady Design-Kit, feed-driven)
// Quelle der Wahrheit: steady.page/sebastian/rss. Wird live gerendert, Edge-Cache 10 Min.

export const FEED_URL    = "https://steady.page/sebastian/rss";
export const PUBLICATION = "Blaupause";
export const AUTHOR      = "Sebastian Esser";
export const STEADY_PUBLICATION_ID = "ab2d81e4-59a5-4097-a668-110ad2cd3256"; // Steady widget_loader (Smart Layers/Checkout/Paywall)
export const PER_PAGE    = 12;
export const PINNED_GUID = null;   // optional: eine Post-GUID als Hero pinnen; null = neuester Post
export const MAX_PILLS   = 8;

/* ------------------------------------------------------------------ Feed */

export async function getItems() {
  const res = await fetch(FEED_URL, {
    headers: { "user-agent": "BlaupauseKit/1.0 (+cloudflare-pages)" },
    cf: { cacheTtl: 600, cacheEverything: true },   // Edge-Cache 10 Min (Produktion)
  });
  if (!res.ok) throw new Error("feed HTTP " + res.status);
  return parseFeed(await res.text());
}

function stripCdata(s) {
  return s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}
function tag(block, name) {
  const m = block.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">"));
  return m ? stripCdata(m[1]) : "";
}
function allTags(block, name) {
  const re = new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">", "g");
  const out = []; let m;
  while ((m = re.exec(block))) out.push(stripCdata(m[1]));
  return out;
}

export function parseFeed(xml) {
  const items = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const media = b.match(/<media:content\b[^>]*\burl="([^"]+)"/);
    items.push({
      title:       tag(b, "title"),
      description: tag(b, "description"),
      categories:  allTags(b, "category"),
      image:       media ? media[1] : "",
      link:        tag(b, "link"),
      guid:        tag(b, "guid"),
      pubDate:     tag(b, "pubDate"),
    });
  }
  return items;
}

/* ------------------------------------------------------------------ Utils */

const MONTHS = ["January","February","March","April","May","June","July","August",
                "September","October","November","December"];
export function fmtDate(pub) {
  const d = new Date(pub);
  if (isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function teaser(url, w, h) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return esc(url + sep + `auto=format&w=${w}&h=${h}&fit=crop&crop=faces`);
}
function topCategories(items) {
  const counts = new Map();
  for (const it of items) for (const c of it.categories) {
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PILLS).map(e => e[0]);
}

/* ------------------------------------------------------------------ Struktur-Config (Cookie) */
// Vom Side-Panel gesetzter Cookie kitstruct=shell=portal&auf=gross&stream=rubrik&rails=neueste,meist,themen
// Default (kein Cookie) = heutige Seite: einspaltig / Split-Hero / flache Liste.
export function parseStruct(cookie) {
  const def = { shell: "single", auf: "klein", stream: "liste", rails: [],
                headerStyle: "links", search: false, brand: "", nav: null };
  if (!cookie) return def;
  const m = cookie.match(/(?:^|;\s*)kitstruct=([^;]*)/);
  if (m) {
    try {
      const q = new URLSearchParams(decodeURIComponent(m[1]));
      def.shell  = q.get("shell")  === "portal" ? "portal" : "single";
      def.auf    = q.get("auf")    === "gross"  ? "gross"  : "klein";
      def.stream = q.get("stream") === "rubrik" ? "rubrik" : "liste";
      def.headerStyle = q.get("header") === "zentriert" ? "zentriert" : "links";
      def.search = q.get("search") === "1";
      const allow = ["neueste", "meist", "themen"];
      if (q.has("rails")) def.rails = (q.get("rails") || "").split(",").filter(r => allow.includes(r));
      else def.rails = def.shell === "portal" ? allow.slice() : [];
    } catch (e) {}
  }
  // Titel + Navigation (reicher JSON-Cookie)
  const cm = cookie.match(/(?:^|;\s*)kitchrome=([^;]*)/);
  if (cm) {
    try {
      const o = JSON.parse(decodeURIComponent(cm[1]));
      if (typeof o.brand === "string") def.brand = o.brand.slice(0, 60);
      if (Array.isArray(o.nav)) def.nav = o.nav.filter(n => n && n.l).slice(0, 8)
        .map(n => ({ l: String(n.l).slice(0, 40), h: String(n.h || "#").slice(0, 300), x: !!n.x }));
    } catch (e) {}
  }
  return def;
}

/* ------------------------------------------------------------------ CSS (Kit-Tokens) */

const CSS = `
:root{
  --font-head:"Inter", system-ui, -apple-system, sans-serif;
  --font-body:"Inter", system-ui, -apple-system, sans-serif;
  --fs:1;
  --text-base:calc(18px*var(--fs)); --text-h1:calc(50px*var(--fs)); --lh-h1:1.12; --text-card-title:calc(18px*var(--fs)); --text-nav:16px; --text-pill:12px;
  --lh-body:1.55; --track-head:-.01em; --case-head:none; --align-head:left; --card-ar:16/9;
  --weight-heading:700; --weight-body:400;
  --color-ink:#291E38; --color-ink-soft:#6B6577; --color-brand:#137EC0; --color-accent:#FF7264;
  --color-line:#9A95A6; --color-hairline:#ECEAEF; --color-bg:#FFFFFF; --btn-fg:#FFFFFF;
  --radius-btn:1px; --radius-card:0; --radius-pill:20px; --container:1024px; --reading:620px;
}
*,*::before,*::after{box-sizing:border-box;}
html{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
body{margin:0;background:var(--color-bg);color:var(--color-ink);font-family:var(--font-body);
     font-size:var(--text-base);font-weight:var(--weight-body);line-height:var(--lh-body);}
a{color:inherit;text-decoration:none;} img{display:block;max-width:100%;}
.container{max-width:var(--container);margin:0 auto;padding:0 24px;}
.btn{display:inline-block;font:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;
     text-transform:uppercase;padding:11px 20px;border:1px solid transparent;cursor:pointer;border-radius:var(--radius-btn);}
.btn--primary{background:var(--color-brand);color:var(--btn-fg);}
.btn--outline{background:#fff;color:var(--color-ink);border-color:#d7d4dd;}
.nav-action{font:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--color-ink);cursor:pointer;background:none;border:0;transition:color .15s;}
.nav-action:hover{color:var(--color-brand);}
/* header */
.site-header{border-bottom:1px solid var(--color-hairline);background:#fff;}
.site-header__inner{display:flex;align-items:center;justify-content:space-between;height:74px;}
.brand{display:flex;align-items:center;gap:11px;}
.brand__logo{width:34px;height:34px;border-radius:2px;object-fit:cover;}
.brand__name{font-weight:700;font-size:15px;letter-spacing:.13em;text-transform:uppercase;}
.header-actions{display:flex;align-items:center;gap:12px;}
.tabs{border-bottom:1px solid var(--color-hairline);background:#fff;}
.tabs__inner{display:flex;gap:30px;}
.tab{display:inline-block;padding:16px 2px;font-size:var(--text-nav);color:var(--color-line);
     border-bottom:2px solid transparent;margin-bottom:-1px;}
.tab--active{color:var(--color-ink);border-bottom-color:var(--color-accent);font-weight:500;}
.site-header--center .site-header__inner{justify-content:center;position:relative;}
.site-header--center .header-actions{position:absolute;right:0;top:50%;transform:translateY(-50%);}
.tabs--center .tabs__inner{justify-content:center;}
.tabs__search{display:inline-flex;align-items:center;align-self:center;color:var(--color-line);cursor:pointer;}
.tabs__search svg{width:16px;height:16px;}
/* hero */
.hero{padding:56px 0 44px;}
.hero__grid{display:grid;grid-template-columns:1.25fr 1fr;gap:48px;align-items:center;}
.eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;
         letter-spacing:.1em;text-transform:uppercase;color:var(--color-ink);margin-bottom:18px;}
.eyebrow svg{width:13px;height:13px;}
.hero__title{font-size:var(--text-h1);line-height:var(--lh-h1);font-weight:var(--weight-heading);margin:0 0 18px;letter-spacing:var(--track-head);text-transform:var(--case-head);}
.hero__title a{transition:color .15s;} .hero__title a:hover{color:var(--color-brand);}
.hero__excerpt{font-size:19px;line-height:1.55;color:var(--color-ink-soft);margin:0 0 20px;max-width:46ch;}
.hero__date{font-size:14px;color:var(--color-line);}
.hero__medialink{display:block;}
.hero__media{width:100%;aspect-ratio:4/3;background:var(--color-line);border-radius:var(--radius-card);object-fit:cover;}
/* pills */
.pills{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;padding:8px 0 40px;}
.pill{font-size:var(--text-pill);letter-spacing:.04em;text-transform:uppercase;color:var(--color-ink);
      border:1px solid var(--color-line);border-radius:var(--radius-pill);padding:7px 15px;background:#fff;line-height:1;white-space:nowrap;}
/* grid */
.grid{display:grid;grid-template-columns:repeat(var(--grid-cols,3),1fr);gap:36px 30px;padding-bottom:48px;}
.card__media{width:100%;aspect-ratio:var(--card-ar);background:var(--color-line);border-radius:var(--radius-card);object-fit:cover;}
.card__title{font-size:var(--text-card-title);font-weight:700;line-height:1.3;margin:14px 0 0;text-transform:var(--case-head);transition:color .15s;}
.card:hover .card__title{color:var(--color-brand);}
.card__excerpt{font-size:14px;color:var(--color-ink-soft);line-height:1.45;margin:7px 0 0;}
.card__date{font-size:13px;color:var(--color-line);margin-top:9px;}
.pagination{display:flex;justify-content:center;align-items:center;gap:10px;padding:8px 0 64px;font-size:16px;color:var(--color-line);}
.pagination a,.pagination span{min-width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;}
.pagination .is-current{color:var(--color-ink);font-weight:700;}
/* single post */
.post{max-width:var(--reading);margin:0 auto;padding:46px 0 16px;}
.post__back{display:inline-flex;align-items:center;gap:7px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--color-line);margin-bottom:30px;}
.post__back svg{width:13px;height:13px;}
.post__title{font-size:calc(48px*var(--fs));line-height:1.12;font-weight:var(--weight-heading);letter-spacing:var(--track-head);text-transform:var(--case-head);margin:0 0 20px;}
.post__engagement{display:flex;align-items:center;gap:24px;color:var(--color-line);font-size:14px;}
.post__engagement span{display:inline-flex;align-items:center;gap:7px;} .post__engagement svg{width:18px;height:18px;}
.post__byline{font-size:14px;color:var(--color-line);margin:14px 0 0;padding-bottom:26px;border-bottom:1px solid var(--color-hairline);}
.post__figure{margin:30px 0;} .post__figure img{width:100%;border-radius:var(--radius-card);background:var(--color-line);}
.post__body{font-family:var(--font-body);font-size:calc(22px*var(--fs));line-height:var(--lh-body);color:var(--color-ink);}
.post__body p{margin:0 0 26px;} .post__body p.lede{font-weight:600;}
.post__readon{margin:14px 0 8px;}
/* footer */
.site-footer{border-top:1px solid var(--color-hairline);padding:40px 0 56px;margin-top:40px;}
.footer__inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;}
.footer__brand{display:flex;align-items:center;gap:14px;}
.footer__wordmark{height:22px;width:auto;opacity:.9;} .footer__by{font-size:14px;color:var(--color-line);}
.footer__links{display:flex;flex-wrap:wrap;gap:20px;font-size:14px;color:var(--color-ink-soft);}
.footer__lang{font-size:14px;color:var(--color-ink-soft);border:1px solid var(--color-hairline);padding:7px 12px;border-radius:2px;}
.footer__select{font:inherit;font-size:14px;color:var(--color-ink-soft);border:1px solid var(--color-hairline);padding:7px 12px;border-radius:2px;background:#fff;cursor:pointer;}
.font-bar{border-top:1px solid var(--color-hairline);margin-top:40px;padding:22px 0;}
.font-bar__inner{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:6px 8px;}
.loadmore-wrap{display:flex;justify-content:center;padding:8px 0 56px;}
.load-more{font:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--color-ink);background:#fff;border:1px solid var(--color-line);border-radius:var(--radius-pill);padding:13px 30px;cursor:pointer;transition:border-color .15s,color .15s;}
.load-more:hover{border-color:var(--color-ink);color:var(--color-brand);}
.load-more:disabled{opacity:.5;cursor:default;}
/* Headlines/Display nutzen --font-head; alles andere (Body) erbt --font-body */
.brand__name,.tab,.eyebrow,.hero__title,.pill,.card__title,.load-more,.btn,.nav-action,.post__title,.post__back{font-family:var(--font-head);}
.font-bar__label{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--color-line);white-space:nowrap;}
/* layout presets */
html.dens-compact{--text-base:calc(16px*var(--fs));--text-h1:calc(42px*var(--fs));}
html.dens-compact .hero{padding:36px 0 30px;} html.dens-compact .grid{gap:24px 22px;} html.dens-compact .container{padding:0 20px;}
html.hero-center .hero__grid{grid-template-columns:1fr;text-align:center;justify-items:center;}
html.hero-center .hero__excerpt{margin-left:auto;margin-right:auto;} html.hero-center .hero__medialink{display:none;}
/* hero text alignment + roomy density */
.hero__body{text-align:var(--align-head);}
html.hero-center .hero__body{text-align:center;}
html.dens-roomy{--lh-body:1.7;}
html.dens-roomy .hero{padding:76px 0 58px;} html.dens-roomy .grid{gap:48px 40px;} html.dens-roomy .container{padding:0 30px;}
/* teaser / card styles */
.card__body{display:block;}
html.card-side .card{display:grid;grid-template-columns:112px 1fr;gap:15px;align-items:start;}
html.card-side .card__media{aspect-ratio:1/1;} html.card-side .card__title{margin-top:0;}
html.card-text .card__media{display:none;}
html.card-overlay .card{position:relative;border-radius:var(--radius-card);overflow:hidden;}
html.card-overlay .card__media{aspect-ratio:3/4;}
html.card-overlay .card__body{position:absolute;left:0;right:0;bottom:0;padding:16px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.55) 45%,rgba(0,0,0,.85));}
html.card-overlay .card__title,html.card-overlay .card__excerpt,html.card-overlay .card__date{color:#fff;} html.card-overlay .card__title{margin-top:0;}
html.card-list .grid{grid-template-columns:1fr;gap:0;}
html.card-list .card{display:grid;grid-template-columns:1fr;border-bottom:1px solid var(--color-hairline);padding:18px 0;}
html.card-list .card__media{display:none;}
/* card surfaces */
html.surf-soft .card{background:var(--color-bg);border-radius:12px;box-shadow:0 6px 22px rgba(41,30,56,.10);overflow:hidden;}
html.surf-outline .card{border:1px solid var(--color-hairline);border-radius:10px;overflow:hidden;}
html.surf-soft .card__body,html.surf-outline .card__body{padding:2px 15px 16px;}
html.surf-soft.card-overlay .card__body,html.surf-outline.card-overlay .card__body{padding:16px;}
/* image treatments */
html.img-gray .card__media,html.img-gray .hero__media,html.img-gray .post__figure img{filter:grayscale(1);transition:filter .35s;}
html.img-gray .card:hover .card__media{filter:none;}
html.img-duo .card__media,html.img-duo .hero__media,html.img-duo .post__figure img{filter:grayscale(1) contrast(1.05) sepia(.5) hue-rotate(165deg) saturate(2.4) brightness(.96);}
/* Aufmacher (großer Opener) */
.aufmacher{max-width:760px;margin:0 auto;}
.aufmacher__title{font-family:var(--font-head);font-size:calc(40px*var(--fs));line-height:1.12;font-weight:var(--weight-heading);letter-spacing:var(--track-head);text-transform:var(--case-head);margin:0 0 14px;}
.aufmacher__title a{transition:color .15s;} .aufmacher__title a:hover{color:var(--color-brand);}
.aufmacher__excerpt{font-size:19px;line-height:1.55;color:var(--color-ink-soft);margin:0 0 14px;max-width:60ch;}
.aufmacher__meta{display:flex;flex-wrap:wrap;align-items:center;gap:14px;font-size:13px;color:var(--color-line);margin:0 0 22px;}
.aufmacher__pin{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--color-ink);} .aufmacher__pin svg{width:13px;height:13px;}
.aufmacher__media{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--color-line);border-radius:var(--radius-card);}
.aufmacher-band{padding:48px 0 8px;}
/* Portal-Shell (3-spaltig: Leisten + Mitte) */
.portal-band{padding:40px 0 8px;}
.portal-grid{max-width:1256px;margin:0 auto;padding:0 24px;display:grid;gap:40px;align-items:start;}
.portal-center .aufmacher{max-width:none;margin:0;}
.rail{display:flex;flex-direction:column;gap:30px;min-width:0;}
.rail-module__title{font-family:var(--font-head);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--color-ink);margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid var(--color-ink);}
.rail-list,.rail-num{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;}
.rail-list a{display:block;}
.rail-list__t{display:block;font-family:var(--font-head);font-size:15px;font-weight:600;line-height:1.3;color:var(--color-ink);}
.rail-list a:hover .rail-list__t{color:var(--color-brand);}
.rail-list__d{display:block;font-size:12px;color:var(--color-line);margin-top:3px;}
.rail-num li{display:flex;gap:12px;align-items:baseline;}
.rail-num__n{font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--color-accent);min-width:22px;line-height:1;}
.rail-num__t{font-size:14px;font-weight:600;line-height:1.3;color:var(--color-ink);}
.rail-num a{display:flex;gap:12px;align-items:baseline;} .rail-num a:hover .rail-num__t{color:var(--color-brand);}
.rail-pills{display:flex;flex-wrap:wrap;gap:8px;}
/* Rubriken-Sektionen */
.rubrik{padding:14px 0 30px;}
.rubrik__head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:2px solid var(--color-ink);padding-top:12px;margin-bottom:22px;}
.rubrik__chip{font-family:var(--font-head);font-size:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--color-ink);}
.rubrik__more{font-family:var(--font-head);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--color-brand);}
.rubrik__grid{padding-bottom:0;}
@media (max-width:1100px){
  .portal-grid{grid-template-columns:1fr!important;gap:32px;}
  .portal-center{order:-1;}
  .rail{flex-direction:row;flex-wrap:wrap;gap:32px;}
  .rail .rail-module{flex:1 1 240px;}
}
/* customizer panel */
.cz-fab{position:fixed;right:20px;bottom:20px;z-index:60;width:50px;height:50px;border-radius:50%;border:0;background:var(--color-brand);color:#fff;font-size:20px;cursor:pointer;box-shadow:0 8px 24px rgba(41,30,56,.25);}
html.cz-on .cz-fab{display:none;}
.cz{position:fixed;top:0;right:0;z-index:61;width:340px;max-width:92vw;height:100vh;background:#fff;border-left:1px solid #ECEAEF;box-shadow:-14px 0 44px rgba(41,30,56,.13);transform:translateX(100%);transition:transform .28s ease;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif;color:#291E38;}
html.cz-on .cz{transform:none;}
.cz-head{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #ECEAEF;font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;}
.cz-head>div{display:flex;align-items:center;gap:8px;}
.cz-reset{font:inherit;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#9A95A6;background:none;border:1px solid #ECEAEF;border-radius:6px;padding:5px 9px;cursor:pointer;}
.cz-x{width:28px;height:28px;border:1px solid #ECEAEF;border-radius:6px;background:#fff;color:#9A95A6;cursor:pointer;font-size:16px;line-height:1;}
.cz-body{overflow-y:auto;flex:1;}
.cz-sec{border-bottom:1px solid #ECEAEF;}
.cz-sh{width:100%;display:flex;align-items:center;justify-content:space-between;padding:15px 16px;font:inherit;font-size:14px;font-weight:600;background:none;border:0;cursor:pointer;color:#291E38;}
.cz-cv{color:#9A95A6;transition:transform .2s;} .cz-sec:not(.cz-open) .cz-cv{transform:rotate(-90deg);}
.cz-sec:not(.cz-open) .cz-sb{display:none;}
.cz-sb{padding:0 16px 18px;}
.cz-lbl{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#9A95A6;margin:12px 0 6px;}
.cz-sel{width:100%;border:1px solid #d7d4dd;border-radius:6px;padding:9px 11px;font:inherit;font-size:13px;color:#291E38;background:#fff;cursor:pointer;}
.cz-pal{display:flex;gap:10px;flex-wrap:wrap;}
.cz-pal button{width:34px;height:34px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #ECEAEF;cursor:pointer;padding:0;}
.cz-pal button.on{box-shadow:0 0 0 2px #137EC0;}
.cz-colors{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;}
.cz-color{display:flex;align-items:center;gap:8px;font-size:12px;color:#6B6577;}
.cz-color input{width:30px;height:30px;border:1px solid #ECEAEF;border-radius:6px;padding:0;background:none;cursor:pointer;}
.cz-seg{display:flex;gap:6px;}
.cz-seg button{flex:1;font:inherit;font-size:12px;padding:8px 6px;border:1px solid #d7d4dd;border-radius:6px;background:#fff;color:#291E38;cursor:pointer;}
.cz-seg button.on{border-color:#137EC0;background:#137EC0;color:#fff;}
.cz-hint{font-size:11px;color:#9A95A6;margin:2px 0 12px;line-height:1.4;}
.cz-looks{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.cz-look{text-align:left;font:inherit;border:1px solid #d7d4dd;border-radius:8px;padding:9px 11px;background:#fff;color:#291E38;cursor:pointer;}
.cz-look:hover{border-color:#137EC0;}
.cz-look.on{border-color:#137EC0;box-shadow:inset 0 0 0 1px #137EC0;}
.cz-look b{display:block;font-size:13px;font-weight:600;}
.cz-look span{display:block;font-size:10px;color:#9A95A6;margin-top:2px;line-height:1.25;}
.cz-seg--wrap{flex-wrap:wrap;} .cz-seg--wrap button{flex:1 0 28%;}
.cz-warn{display:none;font-size:11px;color:#C0392B;margin:10px 0 0;line-height:1.4;}
.cz-warn.show{display:block;}
.cz-rails{display:flex;flex-wrap:wrap;gap:6px;}
.cz-rails button{flex:1 1 30%;font:inherit;font-size:12px;padding:8px 6px;border:1px solid #d7d4dd;border-radius:6px;background:#fff;color:#291E38;cursor:pointer;}
.cz-rails button.on{border-color:#137EC0;background:#137EC0;color:#fff;}
.cz-rails--off{opacity:.45;pointer-events:none;}
.cz-inp{width:100%;border:1px solid #d7d4dd;border-radius:6px;padding:9px 11px;font:inherit;font-size:13px;color:#291E38;background:#fff;}
.cz-nav{display:flex;flex-direction:column;gap:6px;}
.cz-nav-row{display:flex;gap:5px;align-items:center;}
.cz-nav-row input{min-width:0;border:1px solid #d7d4dd;border-radius:6px;padding:7px 8px;font:inherit;font-size:12px;color:#291E38;background:#fff;}
.cz-nav-l{flex:0 0 38%;} .cz-nav-h{flex:1;}
.cz-nav-x{flex:0 0 26px;height:30px;border:1px solid #ECEAEF;border-radius:6px;background:#fff;color:#9A95A6;cursor:pointer;font-size:15px;line-height:1;}
.cz-nav-add{margin-top:8px;font:inherit;font-size:12px;color:#137EC0;background:none;border:0;cursor:pointer;padding:2px 0;text-align:left;}
.cz-apply{margin-top:12px;width:100%;font:inherit;font-size:13px;font-weight:600;color:#fff;background:#137EC0;border:0;border-radius:6px;padding:10px;cursor:pointer;}
@media (max-width:560px){.cz{width:100%;}}
@media (max-width:900px){.hero__grid{grid-template-columns:1fr;gap:28px;}.grid{grid-template-columns:repeat(2,1fr);}:root{--text-h1:calc(38px*var(--fs));}}
@media (max-width:680px){.post__title{font-size:calc(34px*var(--fs));}.post__body{font-size:calc(20px*var(--fs));}}
@media (max-width:560px){.grid{grid-template-columns:1fr;}.header-actions .btn--outline{display:none;}}
`;

/* ------------------------------------------------------------------ SVG-Icons */

const ICON_PIN  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3l5 5-2 2-1-1-4 4 1 4-2 2-4-4-5 5-1-1 5-5-4-4 2-2 4 1 4-4-1-1z"/></svg>`;
const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>`;
const ICON_CLAP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 11V6a2 2 0 1 1 4 0v4m0 0V4a2 2 0 1 1 4 0v6m0 0V6a2 2 0 1 1 4 0v8a6 6 0 0 1-6 6h-1a7 7 0 0 1-6-3.5L3 16a2 2 0 0 1 3-2.6L9 15"/></svg>`;
const ICON_EYE  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_SHARE= `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>`;
const ICON_SEARCH= `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;

// Editierbare Standard-Navigation (überschreibbar via kitchrome-Cookie)
const DEFAULT_NAV = [
  { l: "Ausgaben", h: "/" },
  { l: "Mitglied werden", h: "/memberships" },
  { l: "Newsletter anmelden", h: "https://steady.page/de/sebastian/newsletter/sign_up", x: true },
];

/* ------------------------------------------------------------------ Chrome */

// Font-Switcher: Liste + früher Apply (vor Render, kein Flash). Default Inter.
const FONT_INIT = `
window.KIT_FONTS=[{n:"Inter",s:"inter",c:"Grotesk"},{n:"Archivo",s:"archivo",c:"Grotesk"},{n:"Archivo Narrow",s:"archivo-narrow",c:"Grotesk"},{n:"Archivo Black",s:"archivo-black",c:"Grotesk",w:"400,700,900"},{n:"Schibsted Grotesk",s:"schibsted-grotesk",c:"Grotesk"},{n:"Bricolage Grotesque",s:"bricolage-grotesque",c:"Grotesk"},{n:"Libre Franklin",s:"libre-franklin",c:"Grotesk"},{n:"Space Grotesk",s:"space-grotesk",c:"Grotesk"},{n:"Work Sans",s:"work-sans",c:"Grotesk"},{n:"Familjen Grotesk",s:"familjen-grotesk",c:"Grotesk"},{n:"Hanken Grotesk",s:"hanken-grotesk",c:"Grotesk"},{n:"Source Sans 3",s:"source-sans-3",c:"Humanistisch"},{n:"Fira Sans",s:"fira-sans",c:"Humanistisch"},{n:"Public Sans",s:"public-sans",c:"Humanistisch"},{n:"Mulish",s:"mulish",c:"Humanistisch"},{n:"Montserrat",s:"montserrat",c:"Geometrisch"},{n:"Poppins",s:"poppins",c:"Geometrisch"},{n:"Sora",s:"sora",c:"Geometrisch"},{n:"Lexend",s:"lexend",c:"Geometrisch"},{n:"Oswald",s:"oswald",c:"Condensed"},{n:"Barlow",s:"barlow",c:"Condensed"},{n:"Barlow Condensed",s:"barlow-condensed",c:"Condensed"},{n:"Barlow Semi Condensed",s:"barlow-semi-condensed",c:"Condensed"},{n:"Saira",s:"saira",c:"Condensed"},{n:"Saira Condensed",s:"saira-condensed",c:"Condensed"},{n:"Saira Semi Condensed",s:"saira-semi-condensed",c:"Condensed"},{n:"Geist",s:"geist",c:"Neuer"},{n:"Geist Mono",s:"geist-mono",g:"monospace",c:"Neuer"},{n:"Instrument Sans",s:"instrument-sans",c:"Neuer"},{n:"Onest",s:"onest",c:"Neuer"},{n:"Figtree",s:"figtree",c:"Neuer"},{n:"Albert Sans",s:"albert-sans",c:"Neuer"},{n:"Playfair Display",s:"playfair-display",g:"serif",c:"Serif Display"},{n:"Fraunces",s:"fraunces",g:"serif",c:"Serif Display"},{n:"DM Serif Display",s:"dm-serif-display",g:"serif",c:"Serif Display",w:"400"},{n:"Cormorant Garamond",s:"cormorant-garamond",g:"serif",c:"Serif Display"},{n:"Instrument Serif",s:"instrument-serif",g:"serif",c:"Serif Display",w:"400"},{n:"Lora",s:"lora",g:"serif",c:"Serif Text"},{n:"Source Serif 4",s:"source-serif-4",g:"serif",c:"Serif Text"},{n:"Newsreader",s:"newsreader",g:"serif",c:"Serif Text"},{n:"Spectral",s:"spectral",g:"serif",c:"Serif Text"},{n:"Libre Baskerville",s:"libre-baskerville",g:"serif",c:"Serif Text",w:"400,700"},{n:"Crimson Pro",s:"crimson-pro",g:"serif",c:"Serif Text"},{n:"Merriweather",s:"merriweather",g:"serif",c:"Serif Text",w:"400,700,900"},{n:"Literata",s:"literata",g:"serif",c:"Serif Text"},{n:"Bitter",s:"bitter",g:"serif",c:"Serif Text"},{n:"PT Serif",s:"pt-serif",g:"serif",c:"Serif Text",w:"400,700"}];
window.KIT_FONT_CATS=["Grotesk","Humanistisch","Geometrisch","Condensed","Neuer","Serif Display","Serif Text"];
window.KIT_PAIRS=[{n:"Nordisch editorial",h:"schibsted-grotesk",b:"source-sans-3"},{n:"Zeitungsklassiker",h:"libre-franklin",b:"source-sans-3"},{n:"Headline-Werkstatt",h:"archivo",b:"inter"},{n:"Display mit Charakter",h:"bricolage-grotesque",b:"inter"},{n:"Geometrisch & sauber",h:"space-grotesk",b:"work-sans"},{n:"Masthead / Condensed",h:"oswald",b:"public-sans"},{n:"Tech-editorial",h:"geist",b:"inter"},{n:"Eine Familie",h:"archivo-black",b:"archivo"},{n:"Warm & lesbar",h:"familjen-grotesk",b:"mulish"},{n:"Hochkontrast-Magazin",h:"playfair-display",b:"source-serif-4"},{n:"Serife trifft Grotesk",h:"fraunces",b:"inter"},{n:"Buch / Longform",h:"cormorant-garamond",b:"crimson-pro"},{n:"News-Longform",h:"libre-franklin",b:"newsreader"},{n:"Instrument-Duo",h:"instrument-serif",b:"instrument-sans"},{n:"Redaktion klassisch",h:"dm-serif-display",b:"lora"}];
window.KIT_DEFAULT_HEAD="inter";window.KIT_DEFAULT_BODY="inter";
window.KIT_PALETTES=[{n:"Steady",v:{"--color-brand":"#137EC0","--color-ink":"#291E38","--color-ink-soft":"#6B6577","--color-accent":"#FF7264","--color-line":"#9A95A6","--color-hairline":"#ECEAEF","--color-bg":"#FFFFFF"}},{n:"Nacht",v:{"--color-brand":"#4DA3E0","--color-ink":"#ECEAF2","--color-ink-soft":"#A6A2B5","--color-accent":"#FF7264","--color-line":"#5A5470","--color-hairline":"#2A2636","--color-bg":"#14121A"}},{n:"Wald",v:{"--color-brand":"#1E7A4F","--color-ink":"#1C2B22","--color-ink-soft":"#5C6B62","--color-accent":"#E0823C","--color-line":"#9AA89F","--color-hairline":"#E7EEE9","--color-bg":"#FFFFFF"}},{n:"Bordeaux",v:{"--color-brand":"#8E2B43","--color-ink":"#2B1A20","--color-ink-soft":"#6E5860","--color-accent":"#C99A2E","--color-line":"#B39AA2","--color-hairline":"#F0E8EB","--color-bg":"#FFFFFF"}},{n:"Mono",v:{"--color-brand":"#291E38","--color-ink":"#1A1A1A","--color-ink-soft":"#6B6B6B","--color-accent":"#1A1A1A","--color-line":"#B0B0B0","--color-hairline":"#ECECEC","--color-bg":"#FFFFFF"}}];
(function(){var D=document.documentElement;var loaded={inter:1};
function hx(h){h=(h||"").replace("#","");if(h.length===3)h=h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];}
function rl(h){var c=hx(h).map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];}
function ratio(a,b){var L1=rl(a),L2=rl(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
function btnFg(b){return rl(b)>0.42?"#16121d":"#ffffff";}
window.KIT_RATIO=ratio;
function ssave(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function setObj(s,k,v){var o=jget(s);o[k]=v;jset(s,o);}
function ff(slug){for(var i=0;i<window.KIT_FONTS.length;i++)if(window.KIT_FONTS[i].s===slug)return window.KIT_FONTS[i];return window.KIT_FONTS[0];}function ld(f){if(loaded[f.s])return;var l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.bunny.net/css?family="+f.s+":"+(f.w||"400,500,600,700")+"&display=swap";document.head.appendChild(l);loaded[f.s]=1;}function jget(k){try{return JSON.parse(localStorage.getItem(k)||"{}");}catch(e){return {};}}function jset(k,o){try{localStorage.setItem(k,JSON.stringify(o));}catch(e){}}window.kitApplyFont=function(role,slug,save){var f=ff(slug);ld(f);D.style.setProperty(role==="head"?"--font-head":"--font-body",'"'+f.n+'", '+(f.g||"sans-serif"));if(save){try{localStorage.setItem(role==="head"?"kitFontHead":"kitFontBody",f.s);}catch(e){}}};window.kitColor=function(name,val,save){D.style.setProperty(name,val);if(name==="--color-brand")D.style.setProperty("--btn-fg",btnFg(val));if(save){var c=jget("kitColors");c[name]=val;jset("kitColors",c);}};window.kitPalette=function(idx,save){var p=window.KIT_PALETTES[idx];if(!p)return;var c=save?jget("kitColors"):null;for(var k in p.v){D.style.setProperty(k,p.v[k]);if(c)c[k]=p.v[k];}D.style.setProperty("--btn-fg",btnFg(p.v["--color-brand"]));if(save){jset("kitColors",c);try{localStorage.setItem("kitPalette",idx);}catch(e){}}};window.kitSetLayout=function(kind,val,save){if(kind==="cols")D.style.setProperty("--grid-cols",val);else if(kind==="width")D.style.setProperty("--container",val==="schmal"?"920px":val==="breit"?"1200px":"1024px");else if(kind==="corner"){var r=val==="rund";D.style.setProperty("--radius-card",r?"10px":"0");D.style.setProperty("--radius-btn",r?"8px":"1px");}else if(kind==="dens"){D.classList.remove("dens-compact","dens-roomy");if(val==="kompakt")D.classList.add("dens-compact");else if(val==="grosszuegig")D.classList.add("dens-roomy");}else if(kind==="hero")D.classList.toggle("hero-center",val==="center");if(save)setObj("kitLayout",kind,val);};
window.KIT_BASES={light:{"--color-bg":"#FFFFFF","--color-ink":"#291E38","--color-ink-soft":"#6B6577","--color-line":"#9A95A6","--color-hairline":"#ECEAEF"},dark:{"--color-bg":"#14121A","--color-ink":"#ECEAF2","--color-ink-soft":"#A6A2B5","--color-line":"#5A5470","--color-hairline":"#2A2636"}};
window.kitBase=function(mode,save){var b=window.KIT_BASES[mode];if(!b)return;var c=save?jget("kitColors"):null;for(var k in b){D.style.setProperty(k,b[k]);if(c)c[k]=b[k];}if(save){jset("kitColors",c);ssave("kitBase",mode);}};
window.kitType=function(kind,val,save){if(kind==="size")D.style.setProperty("--fs",val==="klein"?"0.92":val==="gross"?"1.12":"1");else if(kind==="lead")D.style.setProperty("--lh-body",val==="eng"?"1.4":val==="luftig"?"1.75":"1.55");else if(kind==="track")D.style.setProperty("--track-head",val==="eng"?"-.03em":val==="weit"?".02em":"-.01em");else if(kind==="case")D.style.setProperty("--case-head",val==="gross"?"uppercase":val==="title"?"capitalize":"none");else if(kind==="align")D.style.setProperty("--align-head",val==="zentriert"?"center":"left");if(save)setObj("kitType",kind,val);};
window.kitCard=function(kind,val,save){if(kind==="style"){D.classList.remove("card-side","card-text","card-overlay","card-list");if(val!=="classic")D.classList.add("card-"+val);}else if(kind==="aspect")D.style.setProperty("--card-ar",val==="4:3"?"4/3":val==="1:1"?"1/1":"16/9");else if(kind==="surface"){D.classList.remove("surf-soft","surf-outline");if(val!=="flat")D.classList.add("surf-"+val);}else if(kind==="image"){D.classList.remove("img-gray","img-duo");if(val==="graustufen")D.classList.add("img-gray");else if(val==="duotone")D.classList.add("img-duo");}if(save)setObj("kitCard",kind,val);};
window.KIT_LOOKS=[{n:"Steady",d:"Klar & journalistisch",head:"inter",body:"inter",base:"light",palette:0,type:{size:"standard",lead:"normal",track:"normal",case:"normal",align:"links"},layout:{corner:"eckig",dens:"komfortabel",hero:"split",width:"standard"},card:{style:"classic",surface:"flat",image:"farbe",aspect:"16:9"}},{n:"Magazin",d:"Serifen & Kontrast",head:"playfair-display",body:"source-serif-4",base:"light",type:{size:"gross",lead:"normal",track:"eng",case:"normal",align:"links"},layout:{corner:"eckig",dens:"komfortabel",hero:"split",width:"standard"},card:{style:"classic",surface:"flat",image:"farbe",aspect:"4:3"}},{n:"Minimal",d:"Ruhig, viel Weissraum",head:"inter",body:"inter",base:"light",palette:4,type:{size:"standard",lead:"luftig",track:"normal",case:"normal",align:"links"},layout:{corner:"eckig",dens:"grosszuegig",hero:"split",width:"schmal"},card:{style:"text",surface:"flat",image:"farbe",aspect:"16:9"}},{n:"Bold",d:"Laut & Grossbuchstaben",head:"archivo-black",body:"archivo",base:"light",palette:0,type:{size:"gross",lead:"normal",track:"eng",case:"gross",align:"links"},layout:{corner:"eckig",dens:"komfortabel",hero:"split",width:"standard"},card:{style:"overlay",surface:"flat",image:"farbe",aspect:"16:9"}},{n:"Klassik",d:"Elegant & zentriert",head:"fraunces",body:"lora",base:"light",palette:3,type:{size:"standard",lead:"normal",track:"normal",case:"normal",align:"zentriert"},layout:{corner:"rund",dens:"komfortabel",hero:"center",width:"standard"},card:{style:"classic",surface:"soft",image:"graustufen",aspect:"4:3"}},{n:"Nacht",d:"Dark Mode",head:"inter",body:"inter",base:"dark",palette:1,type:{size:"standard",lead:"normal",track:"normal",case:"normal",align:"links"},layout:{corner:"rund",dens:"komfortabel",hero:"split",width:"standard"},card:{style:"classic",surface:"outline",image:"farbe",aspect:"16:9"}},{n:"Magazin-Portal",d:"3-spaltig, rubriziert",head:"mulish",body:"mulish",base:"light",type:{size:"standard",lead:"normal",track:"normal",case:"normal",align:"links"},layout:{corner:"eckig",dens:"komfortabel",hero:"split",width:"breit",cols:"4"},card:{style:"classic",surface:"flat",image:"farbe",aspect:"16:9"},colors:{"--color-brand":"#954FCF","--color-accent":"#954FCF"},struct:{shell:"portal",auf:"gross",stream:"rubrik",rails:["neueste","meist","themen"]}}];
function readStruct(){try{return JSON.parse(localStorage.getItem("kitStruct")||"{}");}catch(e){return {};}}
function structSer(s){var p=[];if(s.shell)p.push("shell="+s.shell);if(s.auf)p.push("auf="+s.auf);if(s.stream)p.push("stream="+s.stream);if(s.header)p.push("header="+s.header);if(s.search)p.push("search="+s.search);if(s.rails)p.push("rails="+s.rails.join(","));return p.join("&");}
window.kitStructSet=function(obj,reload){var s=readStruct();for(var sk in obj)s[sk]=obj[sk];try{localStorage.setItem("kitStruct",JSON.stringify(s));}catch(e){}document.cookie="kitstruct="+encodeURIComponent(structSer(s))+";path=/;max-age=31536000";if(reload)location.reload();};
window.kitChromeSet=function(o){try{localStorage.setItem("kitChrome",JSON.stringify(o));}catch(e){}document.cookie="kitchrome="+encodeURIComponent(JSON.stringify(o))+";path=/;max-age=31536000";location.reload();};
window.kitLook=function(idx,save){var L=window.KIT_LOOKS[idx];if(!L)return;window.kitApplyFont("head",L.head,save);window.kitApplyFont("body",L.body,save);if(L.palette!=null)window.kitPalette(L.palette,save);if(L.base)window.kitBase(L.base,save);var k;for(k in L.type)window.kitType(k,L.type[k],save);for(k in L.layout)window.kitSetLayout(k,L.layout[k],save);for(k in L.card)window.kitCard(k,L.card[k],save);if(L.colors)for(k in L.colors)window.kitColor(k,L.colors[k],save);if(save)ssave("kitLook",idx);if(L.struct)window.kitStructSet(L.struct,true);};try{var sh=localStorage.getItem("kitFontHead");if(sh&&sh!==window.KIT_DEFAULT_HEAD)window.kitApplyFont("head",sh,false);}catch(e){}try{var sb=localStorage.getItem("kitFontBody");if(sb&&sb!==window.KIT_DEFAULT_BODY)window.kitApplyFont("body",sb,false);}catch(e){}var C=jget("kitColors");for(var ck in C)D.style.setProperty(ck,C[ck]);if(C["--color-brand"])D.style.setProperty("--btn-fg",btnFg(C["--color-brand"]));var L2=jget("kitLayout");for(var lk in L2)window.kitSetLayout(lk,L2[lk],false);var T2=jget("kitType");for(var tk in T2)window.kitType(tk,T2[tk],false);var K2=jget("kitCard");for(var kk in K2)window.kitCard(kk,K2[kk],false);try{if(localStorage.getItem("kitPanelOpen")==="1")D.classList.add("cz-on");}catch(e){}})();
`;

function head(title) {
  return `<!DOCTYPE html><html lang="de"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<link rel="icon" href="/assets/favicon.png"/>
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin/>
<link id="kit-font-css" href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet"/>
<style>${CSS}</style>
<script>${FONT_INIT}</script>
<script>window.KIT_DEFAULT_BRAND=${JSON.stringify(PUBLICATION)};window.KIT_DEFAULT_NAV=${JSON.stringify(DEFAULT_NAV)};</script>
<!-- Steady Smart Layers / Checkout / Paywall — der echte Steady-Layer -->
<script type="text/javascript" src="https://steady.page/widget_loader/${STEADY_PUBLICATION_ID}"></script>
</head><body>`;
}
function navLinksHtml(nav, activePath) {
  return nav.map(n => {
    const ext = n.x ? ` target="_blank" rel="noopener"` : "";
    const act = (!n.x && n.h === activePath) ? " tab--active" : "";
    return `<a class="tab${act}" href="${esc(n.h)}"${ext}>${esc(n.l)}</a>`;
  }).join("");
}
function header({ tabs = false, activePath = "" } = {}, cfg = {}) {
  const center = cfg.headerStyle === "zentriert";
  const brand  = (cfg.brand && cfg.brand.trim()) ? cfg.brand : PUBLICATION;
  const nav    = (cfg.nav && cfg.nav.length) ? cfg.nav : DEFAULT_NAV;
  const search = cfg.search
    ? `<span class="tabs__search" role="button" tabindex="0" aria-label="Suche">${ICON_SEARCH}</span>` : "";
  const brandHtml = `<a class="brand" href="/"><img class="brand__logo" alt="${esc(brand)}" src="/assets/logo.png"/><span class="brand__name">${esc(brand)}</span></a>`;
  const login = `<div class="header-actions"><a class="steady-login-button" data-size="small" data-language="de" style="display:none;"></a></div>`;
  const navBar = tabs
    ? `<nav class="tabs${center ? " tabs--center" : ""}"><div class="container tabs__inner">${navLinksHtml(nav, activePath)}${search}</div></nav>`
    : "";
  return `<header class="site-header${center ? " site-header--center" : ""}"><div class="container site-header__inner">
  ${brandHtml}
  ${login}
</div></header>${navBar}`;
}
function footer() {
  return `<button class="cz-fab" id="cz-open" aria-label="Seite anpassen" title="Seite anpassen">✦</button>
<aside class="cz" id="cz-panel" aria-label="Anpassen">
  <div class="cz-head"><span>Anpassen</span><div><button class="cz-reset" id="cz-reset" title="Alles zurücksetzen">Reset</button><button class="cz-x" id="cz-close" aria-label="Schließen">›</button></div></div>
  <div class="cz-body">
    <section class="cz-sec cz-open"><button class="cz-sh" data-acc>Looks<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-hint">Ein Klick = ein geprüfter Gesamtstil. Danach feinjustieren.</p>
      <div class="cz-looks" id="cz-looks"></div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Aufbau<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Seitenlayout</label><div class="cz-seg" data-fn="struct" data-kind="shell"><button data-v="single">Einspaltig</button><button data-v="portal">Portal</button></div>
      <label class="cz-lbl">Aufmacher</label><div class="cz-seg" data-fn="struct" data-kind="auf"><button data-v="klein">Klein</button><button data-v="gross">Groß</button></div>
      <label class="cz-lbl">Inhalt</label><div class="cz-seg" data-fn="struct" data-kind="stream"><button data-v="liste">Eine Liste</button><button data-v="rubrik">Nach Rubriken</button></div>
      <label class="cz-lbl">Seitenleisten</label><div class="cz-rails" id="cz-rails"><button data-rail="neueste">Neueste</button><button data-rail="meist">Meistgelesen</button><button data-rail="themen">Themen</button></div>
      <p class="cz-hint">Struktur lädt die Seite kurz neu. Skin bleibt live.</p>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Header<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Stil</label><div class="cz-seg" data-fn="struct" data-kind="header"><button data-v="links">Links</button><button data-v="zentriert">Zentriert</button></div>
      <label class="cz-lbl">Suche</label><div class="cz-seg" data-fn="struct" data-kind="search"><button data-v="0">Aus</button><button data-v="1">An</button></div>
      <label class="cz-lbl">Titel</label><input class="cz-inp" id="cz-brand" type="text" placeholder="Blaupause" maxlength="60"/>
      <label class="cz-lbl">Navigation</label><div class="cz-nav" id="cz-nav"></div>
      <button class="cz-nav-add" id="cz-nav-add" type="button">+ Link hinzufügen</button>
      <button class="cz-apply" id="cz-chrome-apply" type="button">Übernehmen</button>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Schriften<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Editorial-Pairing</label><select id="pair-picker" class="cz-sel"><option value="">– Pairing –</option></select>
      <label class="cz-lbl">Überschriften</label><select id="head-picker" class="cz-sel"></select>
      <label class="cz-lbl">Lauftext</label><select id="body-picker" class="cz-sel"></select>
      <label class="cz-lbl">Schriftgröße</label><div class="cz-seg" data-fn="type" data-kind="size"><button data-v="klein">Klein</button><button data-v="standard">Standard</button><button data-v="gross">Groß</button></div>
      <label class="cz-lbl">Zeilenhöhe</label><div class="cz-seg" data-fn="type" data-kind="lead"><button data-v="eng">Eng</button><button data-v="normal">Normal</button><button data-v="luftig">Luftig</button></div>
      <label class="cz-lbl">Laufweite (Titel)</label><div class="cz-seg" data-fn="type" data-kind="track"><button data-v="eng">Eng</button><button data-v="normal">Normal</button><button data-v="weit">Weit</button></div>
      <label class="cz-lbl">Titel-Schreibung</label><div class="cz-seg" data-fn="type" data-kind="case"><button data-v="normal">Aa</button><button data-v="gross">AA</button><button data-v="title">Aa Bb</button></div>
      <label class="cz-lbl">Hero-Ausrichtung</label><div class="cz-seg" data-fn="type" data-kind="align"><button data-v="links">Links</button><button data-v="zentriert">Zentriert</button></div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Farben<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Basis</label><div class="cz-seg" data-fn="base" data-kind="mode"><button data-v="light">Hell</button><button data-v="dark">Dunkel</button></div>
      <label class="cz-lbl">Palette</label><div class="cz-pal" id="cz-pal"></div>
      <div class="cz-colors">
        <label class="cz-color"><input type="color" id="cz-c-brand" value="#137EC0"><span>Marke</span></label>
        <label class="cz-color"><input type="color" id="cz-c-accent" value="#FF7264"><span>Akzent</span></label>
      </div>
      <p class="cz-warn" id="cz-warn">⚠︎ Wenig Kontrast — Marke kaum sichtbar.</p>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Layout<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Spalten</label><div class="cz-seg" data-fn="layout" data-kind="cols"><button data-v="2">2</button><button data-v="3">3</button><button data-v="4">4</button></div>
      <label class="cz-lbl">Inhaltsbreite</label><div class="cz-seg" data-fn="layout" data-kind="width"><button data-v="schmal">Schmal</button><button data-v="standard">Standard</button><button data-v="breit">Breit</button></div>
      <label class="cz-lbl">Dichte</label><div class="cz-seg" data-fn="layout" data-kind="dens"><button data-v="kompakt">Kompakt</button><button data-v="komfortabel">Komfort</button><button data-v="grosszuegig">Weit</button></div>
      <label class="cz-lbl">Ecken</label><div class="cz-seg" data-fn="layout" data-kind="corner"><button data-v="eckig">Eckig</button><button data-v="rund">Rund</button></div>
      <label class="cz-lbl">Hero</label><div class="cz-seg" data-fn="layout" data-kind="hero"><button data-v="split">Geteilt</button><button data-v="center">Zentriert</button></div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Karten<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Teaser-Stil</label><div class="cz-seg cz-seg--wrap" data-fn="card" data-kind="style"><button data-v="classic">Klassisch</button><button data-v="side">Bild links</button><button data-v="text">Nur Text</button><button data-v="overlay">Overlay</button><button data-v="list">Liste</button></div>
      <label class="cz-lbl">Bildformat</label><div class="cz-seg" data-fn="card" data-kind="aspect"><button data-v="16:9">16:9</button><button data-v="4:3">4:3</button><button data-v="1:1">1:1</button></div>
      <label class="cz-lbl">Kartenfläche</label><div class="cz-seg" data-fn="card" data-kind="surface"><button data-v="flat">Flach</button><button data-v="soft">Schatten</button><button data-v="outline">Umrandet</button></div>
      <label class="cz-lbl">Bild-Look</label><div class="cz-seg" data-fn="card" data-kind="image"><button data-v="farbe">Farbe</button><button data-v="duotone">Duotone</button><button data-v="graustufen">Grau</button></div>
    </div></section>
  </div>
</aside>
<script>(function(){
  var D=document.documentElement;
  function gs(k,d){try{var v=localStorage.getItem(k);return v==null?d:v;}catch(e){return d;}}
  function jget(k){try{return JSON.parse(localStorage.getItem(k)||"{}");}catch(e){return {};}}
  function setOpen(o){D.classList.toggle("cz-on",o);try{localStorage.setItem("kitPanelOpen",o?"1":"0");}catch(e){}}
  var ob=document.getElementById("cz-open"),cb=document.getElementById("cz-close");
  if(ob)ob.addEventListener("click",function(){setOpen(true);});
  if(cb)cb.addEventListener("click",function(){setOpen(false);});
  [].forEach.call(document.querySelectorAll(".cz-sh[data-acc]"),function(h){h.addEventListener("click",function(){h.parentNode.classList.toggle("cz-open");});});
  function clearLook(){try{localStorage.removeItem("kitLook");}catch(e){}markLook();}
  /* fonts */
  function buildPicker(el,cur){if(!el||!window.KIT_FONTS)return;var cats=window.KIT_FONT_CATS||[""];for(var ci=0;ci<cats.length;ci++){var grp=document.createElement("optgroup");grp.label=cats[ci];for(var i=0;i<window.KIT_FONTS.length;i++){var f=window.KIT_FONTS[i];if((f.c||"")!==cats[ci])continue;var o=document.createElement("option");o.value=f.s;o.textContent=f.n;if(f.s===cur)o.selected=true;grp.appendChild(o);}if(grp.children.length)el.appendChild(grp);}}
  var headSel=document.getElementById("head-picker"),bodySel=document.getElementById("body-picker"),pairSel=document.getElementById("pair-picker");
  buildPicker(headSel,gs("kitFontHead",window.KIT_DEFAULT_HEAD));buildPicker(bodySel,gs("kitFontBody",window.KIT_DEFAULT_BODY));
  if(headSel)headSel.addEventListener("change",function(){window.kitApplyFont("head",headSel.value,true);if(pairSel)pairSel.value="";clearLook();});
  if(bodySel)bodySel.addEventListener("change",function(){window.kitApplyFont("body",bodySel.value,true);if(pairSel)pairSel.value="";clearLook();});
  if(pairSel&&window.KIT_PAIRS){for(var pi=0;pi<window.KIT_PAIRS.length;pi++){var pp=window.KIT_PAIRS[pi];var po=document.createElement("option");po.value=pi;po.textContent=pp.n;pairSel.appendChild(po);}pairSel.addEventListener("change",function(){var pr=window.KIT_PAIRS[parseInt(pairSel.value,10)];if(!pr)return;window.kitApplyFont("head",pr.h,true);window.kitApplyFont("body",pr.b,true);if(headSel)headSel.value=pr.h;if(bodySel)bodySel.value=pr.b;clearLook();});}
  /* colors + contrast guard */
  var cmap={"cz-c-brand":"--color-brand","cz-c-accent":"--color-accent"};
  function cv(varn){return getComputedStyle(D).getPropertyValue(varn).trim();}
  function checkWarn(){var w=document.getElementById("cz-warn");if(!w||!window.KIT_RATIO)return;var r=window.KIT_RATIO(cv("--color-brand")||"#000000",cv("--color-bg")||"#ffffff");w.classList.toggle("show",r<2.6);}
  function syncColors(){for(var id in cmap){var el=document.getElementById(id);if(el){var h=cv(cmap[id]);if(h.charAt(0)==="#"&&h.length===7)el.value=h;}}checkWarn();}
  var pal=document.getElementById("cz-pal");
  function markPal(){var sv=gs("kitPalette",null);if(pal)[].forEach.call(pal.children,function(x,i){x.classList.toggle("on",String(i)===sv);});}
  if(pal&&window.KIT_PALETTES){for(var qi=0;qi<window.KIT_PALETTES.length;qi++){(function(idx){var p=window.KIT_PALETTES[idx];var b=document.createElement("button");b.title=p.n;b.style.background=p.v["--color-brand"];b.addEventListener("click",function(){window.kitPalette(idx,true);markPal();syncColors();clearLook();});pal.appendChild(b);})(qi);}}
  for(var cid in cmap){(function(elid,varn){var el=document.getElementById(elid);if(el)el.addEventListener("input",function(){window.kitColor(varn,el.value,true);checkWarn();clearLook();});})(cid,cmap[cid]);}
  /* generic segments (layout / type / card / base) */
  var DEF={layout:{cols:"3",width:"standard",dens:"komfortabel",corner:"eckig",hero:"split"},type:{size:"standard",lead:"normal",track:"normal",case:"normal",align:"links"},card:{style:"classic",aspect:"16:9",surface:"flat",image:"farbe"},struct:{shell:"single",auf:"klein",stream:"liste",header:"links",search:"0"}};
  var STORE={layout:"kitLayout",type:"kitType",card:"kitCard",struct:"kitStruct"};
  function curOf(fn,kind){if(fn==="base")return gs("kitBase","light");var o=jget(STORE[fn]);return (o[kind]!=null)?o[kind]:DEF[fn][kind];}
  function callFn(fn,kind,val){if(fn==="layout")window.kitSetLayout(kind,val,true);else if(fn==="type")window.kitType(kind,val,true);else if(fn==="card")window.kitCard(kind,val,true);else if(fn==="base")window.kitBase(val,true);else if(fn==="struct"){var o={};o[kind]=val;window.kitStructSet(o,true);}}
  function markSeg(seg){var fn=seg.getAttribute("data-fn"),kind=seg.getAttribute("data-kind")||"mode",cur=curOf(fn,kind);[].forEach.call(seg.children,function(b){b.classList.toggle("on",b.getAttribute("data-v")===String(cur));});}
  [].forEach.call(document.querySelectorAll(".cz-seg"),function(seg){var fn=seg.getAttribute("data-fn"),kind=seg.getAttribute("data-kind")||"mode";markSeg(seg);[].forEach.call(seg.children,function(b){b.addEventListener("click",function(){callFn(fn,kind,b.getAttribute("data-v"));markSeg(seg);if(fn==="base")syncColors();clearLook();});});});
  /* struct: Seitenleisten-Mehrfachtoggle (nur bei Portal aktiv) */
  var railsEl=document.getElementById("cz-rails");
  if(railsEl){
    var st0=jget("kitStruct"),shell0=st0.shell||"single";
    var rails0=st0.rails||(shell0==="portal"?["neueste","meist","themen"]:[]);
    railsEl.classList.toggle("cz-rails--off",shell0!=="portal");
    [].forEach.call(railsEl.children,function(b){
      var r=b.getAttribute("data-rail");
      if(rails0.indexOf(r)>=0)b.classList.add("on");
      b.addEventListener("click",function(){
        var s=jget("kitStruct"),cur=s.rails||(((s.shell||"single")==="portal")?["neueste","meist","themen"]:[]);
        var i=cur.indexOf(r);if(i>=0)cur.splice(i,1);else cur.push(r);
        window.kitStructSet({rails:cur},true);
      });
    });
  }
  /* header: Titel + Navigation editierbar (Übernehmen → Cookie + Reload) */
  var navEd=document.getElementById("cz-nav"),brandInp=document.getElementById("cz-brand");
  if(navEd){
    var sc={};try{sc=JSON.parse(localStorage.getItem("kitChrome")||"{}");}catch(e){}
    if(brandInp)brandInp.value=sc.brand||window.KIT_DEFAULT_BRAND||"";
    var navInit=sc.nav;
    if(!navInit){var dom=document.querySelectorAll(".tabs__inner .tab");if(dom.length)navInit=[].map.call(dom,function(a){return {l:a.textContent.trim(),h:a.getAttribute("href"),x:a.target==="_blank"};});}
    if(!navInit)navInit=window.KIT_DEFAULT_NAV||[];
    function navRow(n){var row=document.createElement("div");row.className="cz-nav-row";
      var li=document.createElement("input");li.className="cz-nav-l";li.placeholder="Label";li.value=(n&&n.l)||"";
      var hi=document.createElement("input");hi.className="cz-nav-h";hi.placeholder="URL";hi.value=(n&&n.h)||"";
      var xb=document.createElement("button");xb.type="button";xb.className="cz-nav-x";xb.textContent="×";xb.title="Entfernen";
      xb.addEventListener("click",function(){if(row.parentNode)row.parentNode.removeChild(row);});
      row.appendChild(li);row.appendChild(hi);row.appendChild(xb);navEd.appendChild(row);}
    navInit.forEach(navRow);
    var addB=document.getElementById("cz-nav-add");if(addB)addB.addEventListener("click",function(){navRow({l:"",h:""});});
    var apB=document.getElementById("cz-chrome-apply");
    if(apB)apB.addEventListener("click",function(){
      var out=[];[].forEach.call(navEd.querySelectorAll(".cz-nav-row"),function(r){
        var l=r.querySelector(".cz-nav-l").value.trim(),h=r.querySelector(".cz-nav-h").value.trim();
        if(l)out.push({l:l,h:h||"#",x:(h.indexOf("http")===0&&h.indexOf(location.host)<0)});});
      window.kitChromeSet({brand:(brandInp?brandInp.value.trim():""),nav:out});
    });
  }
  /* looks */
  var looksEl=document.getElementById("cz-looks");
  function markLook(){var sv=gs("kitLook",null);if(looksEl)[].forEach.call(looksEl.children,function(x,i){x.classList.toggle("on",String(i)===sv);});}
  if(looksEl&&window.KIT_LOOKS){for(var lo=0;lo<window.KIT_LOOKS.length;lo++){(function(idx){var L=window.KIT_LOOKS[idx];var b=document.createElement("button");b.className="cz-look";var bb=document.createElement("b");bb.textContent=L.n;var sp=document.createElement("span");sp.textContent=L.d||"";b.appendChild(bb);b.appendChild(sp);b.addEventListener("click",function(){window.kitLook(idx,true);syncAll();});looksEl.appendChild(b);})(lo);}}
  function syncAll(){if(headSel)headSel.value=gs("kitFontHead",window.KIT_DEFAULT_HEAD);if(bodySel)bodySel.value=gs("kitFontBody",window.KIT_DEFAULT_BODY);if(pairSel)pairSel.value="";[].forEach.call(document.querySelectorAll(".cz-seg"),markSeg);markPal();markLook();syncColors();}
  markPal();markLook();syncColors();
  var rb=document.getElementById("cz-reset");if(rb)rb.addEventListener("click",function(){["kitFontHead","kitFontBody","kitColors","kitLayout","kitType","kitCard","kitPalette","kitBase","kitLook","kitPanelOpen"].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});location.reload();});
  var btn=document.getElementById("js-loadmore");
  if(btn)btn.addEventListener("click",function(){
    var next=parseInt(btn.getAttribute("data-next"),10),pages=parseInt(btn.getAttribute("data-pages"),10);
    btn.disabled=true;btn.textContent="Lädt …";
    fetch("/?page="+next).then(function(r){return r.text();}).then(function(html){
      var doc=new DOMParser().parseFromString(html,"text/html"),grid=document.querySelector(".grid");
      doc.querySelectorAll(".grid .card").forEach(function(c){grid.appendChild(document.importNode(c,true));});
      next++;btn.setAttribute("data-next",next);btn.disabled=false;btn.textContent="Mehr laden";
      if(next>pages)btn.style.display="none";
    }).catch(function(){btn.disabled=false;btn.textContent="Mehr laden";});
  });
})();</script>
</body></html>`;
}

/* ------------------------------------------------------------------ Pages */

// Eine Teaser-Karte (wiederverwendet in flacher Liste + Rubriken)
function card(it) {
  return `
    <a class="card" href="/posts/${esc(it.guid)}">
      <img class="card__media" loading="lazy" alt="" src="${teaser(it.image, 800, 450)}"/>
      <div class="card__body">
        <h3 class="card__title">${esc(it.title)}</h3>
        ${it.description ? `<p class="card__excerpt">${esc(it.description)}</p>` : ""}
        <div class="card__date">${esc(fmtDate(it.pubDate))}</div>
      </div>
    </a>`;
}
// Aufmacher klein = heutiger Split-Hero (Text links, Bild rechts)
function heroSplit(hero) {
  return `<section class="hero"><div class="container hero__grid">
  <div class="hero__body">
    <h1 class="hero__title"><a href="/posts/${esc(hero.guid)}">${esc(hero.title)}</a></h1>
    ${hero.description ? `<p class="hero__excerpt">${esc(hero.description)}</p>` : ""}
    <div class="hero__date">${esc(fmtDate(hero.pubDate))}</div>
  </div>
  <a class="hero__medialink" href="/posts/${esc(hero.guid)}">
    <img class="hero__media" alt="" src="${teaser(hero.image, 760, 570)}"/>
  </a>
</div></section>`;
}
// grobe Lesezeit-Schätzung aus dem Teasertext (Feed liefert keinen Volltext)
function readMin(it) {
  const w = (it.description || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(w / 35));
}
// Aufmacher groß = gestapelt: Headline + Excerpt + Meta-Leiste + 4:3-Bild
function aufmacherArticle(hero, withImage) {
  return `<article class="aufmacher">
    <h1 class="aufmacher__title"><a href="/posts/${esc(hero.guid)}">${esc(hero.title)}</a></h1>
    ${hero.description ? `<p class="aufmacher__excerpt">${esc(hero.description)}</p>` : ""}
    <div class="aufmacher__meta"><span class="aufmacher__pin">${ICON_PIN} Pinned</span><span>${esc(fmtDate(hero.pubDate))}</span><span>${readMin(hero)} Min</span></div>
    ${withImage ? `<a class="aufmacher__medialink" href="/posts/${esc(hero.guid)}"><img class="aufmacher__media" alt="" src="${teaser(hero.image, 1100, 825)}"/></a>` : ""}
  </article>`;
}
// Leisten-Module
function railLatest(items) {
  return `<div class="rail-module"><h2 class="rail-module__title">Neueste Inhalte</h2>
    <ul class="rail-list">${items.slice(0, 5).map(it => `<li><a href="/posts/${esc(it.guid)}"><span class="rail-list__t">${esc(it.title)}</span><span class="rail-list__d">${esc(fmtDate(it.pubDate))}</span></a></li>`).join("")}</ul></div>`;
}
function railPopular(items) {
  return `<div class="rail-module"><h2 class="rail-module__title">Meistgelesen</h2>
    <ol class="rail-num">${items.slice(0, 5).map((it, i) => `<li><a href="/posts/${esc(it.guid)}"><span class="rail-num__n">${i + 1}</span><span class="rail-num__t">${esc(it.title)}</span></a></li>`).join("")}</ol></div>`;
}
function railTopics(cats) {
  return `<div class="rail-module"><h2 class="rail-module__title">Meine Themen</h2>
    <div class="rail-pills">${cats.map(c => `<span class="pill">${esc(c)}</span>`).join("")}</div></div>`;
}
// Portal-Band: Leisten flankieren den Aufmacher (Neueste/Themen links, Meistgelesen rechts)
function portalBand(cfg, centerHtml, items, cats) {
  const railL = [];
  if (cfg.rails.includes("neueste")) railL.push(railLatest(items));
  if (cfg.rails.includes("themen")) railL.push(railTopics(cats));
  const railR = [];
  if (cfg.rails.includes("meist")) railR.push(railPopular(items));
  const hasL = railL.length, hasR = railR.length;
  const cols = `${hasL ? "216px " : ""}minmax(0,1fr)${hasR ? " 216px" : ""}`;
  return `<section class="portal-band"><div class="portal-grid" style="grid-template-columns:${cols}">
    ${hasL ? `<aside class="rail rail--l">${railL.join("")}</aside>` : ""}
    <div class="portal-center">${centerHtml}</div>
    ${hasR ? `<aside class="rail rail--r">${railR.join("")}</aside>` : ""}
  </div></section>`;
}
// Stream: nach Rubriken (eine Sektion je Feed-Kategorie, Chip-Titel + „Mehr")
function rubrikStream(rest, cats) {
  if (!cats.length) return `<div class="grid">${rest.slice(0, PER_PAGE).map(card).join("")}</div>`;
  return cats.map(cat => {
    const inCat = rest.filter(it => it.categories.includes(cat)).slice(0, 8);
    if (!inCat.length) return "";
    return `<section class="rubrik"><header class="rubrik__head"><span class="rubrik__chip">${esc(cat)}</span><span class="rubrik__more">Mehr →</span></header>
    <div class="grid rubrik__grid">${inCat.map(card).join("")}</div></section>`;
  }).join("");
}

export function renderLanding(items, page = 1, cfg) {
  if (!items.length) return renderEmpty();
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [] };

  const heroIdx = PINNED_GUID ? Math.max(0, items.findIndex(i => i.guid === PINNED_GUID)) : 0;
  const hero = items[heroIdx];
  const rest = items.filter((_, i) => i !== heroIdx);
  const cats = topCategories(items);

  // 1) Kopf: Portal-Band (mit Leisten) oder einspaltiger Aufmacher/Hero
  let top;
  if (cfg.shell === "portal") {
    top = portalBand(cfg, aufmacherArticle(hero, cfg.auf === "gross"), rest, cats);
  } else if (cfg.auf === "gross") {
    top = `<section class="aufmacher-band"><div class="container">${aufmacherArticle(hero, true)}</div></section>`;
  } else {
    top = heroSplit(hero);
  }

  // 2) Stream: Rubriken-Sektionen oder flache Liste mit Pills + „Mehr laden"
  let stream;
  if (cfg.stream === "rubrik") {
    stream = `<div class="container">${rubrikStream(rest, cats)}<div id="memberships"></div></div>`;
  } else {
    const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
    const p = Math.min(Math.max(1, page), pages);
    const slice = rest.slice((p - 1) * PER_PAGE, p * PER_PAGE);
    const pills = cats.map(c => `<span class="pill">${esc(c)}</span>`).join("");
    const more = pages > 1
      ? `<div class="loadmore-wrap"><button class="load-more" id="js-loadmore" data-next="${p + 1}" data-pages="${pages}">Mehr laden</button></div>`
      : "";
    stream = `<div class="container">
  <div class="pills">${pills}</div>
  <div class="grid">${slice.map(card).join("")}</div>
  ${more}
  <div id="memberships"></div>
  <!-- #memberships: Andock-Punkt für das echte Steady-Membership-/Checkout-Widget. -->
</div>`;
  }

  return head(PUBLICATION) + header({ tabs: true, activePath: "/" }, cfg) + `
<main>${top}${stream}</main>` + footer();
}

function renderPagination(p, pages) {
  if (pages <= 1) return "";
  const out = [];
  const lo = Math.max(1, p - 2), hi = Math.min(pages, lo + 4);
  if (p > 1) out.push(`<a href="/?page=${p - 1}">‹</a>`);
  for (let i = lo; i <= hi; i++) {
    out.push(i === p ? `<span class="is-current">${i}</span>` : `<a href="/?page=${i}">${i}</a>`);
  }
  if (p < pages) out.push(`<a href="/?page=${p + 1}">›</a>`);
  return `<nav class="pagination" aria-label="Pagination">${out.join("")}</nav>`;
}

export function renderPost(item, cfg = {}) {
  return head(`${item.title} — ${PUBLICATION}`) + header({ tabs: false }, cfg) + `
<main><article class="post container">
  <a class="post__back" href="/">${ICON_BACK} ${esc(PUBLICATION)}</a>
  <h1 class="post__title">${esc(item.title)}</h1>
  <div class="post__engagement">
    <span>${ICON_CLAP}0</span><span>${ICON_EYE}0</span><span>${ICON_SHARE}Share</span>
  </div>
  <div class="post__byline">by ${esc(AUTHOR)} · ${esc(fmtDate(item.pubDate))}</div>
  ${item.image ? `<figure class="post__figure"><img alt="" src="${teaser(item.image, 1200, 675)}"/></figure>` : ""}
  <div class="post__body">
    ${item.description ? `<p class="lede">${esc(item.description)}</p>` : ""}
    <p>Dieser Beitrag erscheint im Original auf Steady. Den vollständigen Text liest du dort —
       inklusive Mitglieder-Inhalten.</p>
    <!-- PAYWALL-ANDOCKZONE: hier kommt später das echte Steady-Paywall-/Post-Embed-Widget rein. -->
    <p class="post__readon"><a class="btn btn--primary" href="${esc(item.link)}">Ganzen Beitrag auf Steady lesen</a></p>
  </div>
</article></main>` + footer();
}

export function renderEmpty(cfg = {}) {
  return head(PUBLICATION) + header({ tabs: true, activePath: "/" }, cfg) +
    `<main><div class="container" style="padding:80px 0;color:var(--color-line)">Inhalte laden gerade nicht. Bitte gleich neu laden.</div></main>` +
    footer();
}

export function renderMemberships(cfg = {}) {
  return head("Mitglied werden — " + PUBLICATION) + header({ tabs: true, activePath: "/memberships" }, cfg) + `
<main><div class="container" style="padding:48px 0 72px">
  <h1 style="font-family:var(--font-head);font-size:34px;font-weight:var(--weight-heading);text-align:center;letter-spacing:-.01em;margin:0 0 10px">Mitglied werden</h1>
  <p style="text-align:center;color:var(--color-ink-soft);font-size:18px;margin:0 0 40px">Wähle deine Mitgliedschaft — der Checkout läuft direkt hier auf der Seite.</p>
  <!-- Steady rendert den Checkout in diesen Container (Backend Checkout-URL = /memberships) -->
  <div id="insert_steady_checkout_here" style="display:none;"></div>
</div></main>` + footer();
}

export function render404(cfg = {}) {
  return head("Nicht gefunden — " + PUBLICATION) + header({ tabs: false }, cfg) +
    `<main><div class="container" style="padding:80px 0"><h1 style="font-size:32px">Beitrag nicht gefunden</h1>
     <p style="color:var(--color-ink-soft)"><a class="btn btn--primary" href="/" style="margin-top:12px">Zur Startseite</a></p></div></main>` +
    footer();
}
