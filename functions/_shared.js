// _shared.js — Steady-Feed → HTML-Render (Steady Design-Kit, feed-driven)
// Quelle der Wahrheit: steady.page/sebastian/rss. Wird live gerendert, Edge-Cache 10 Min.

export const FEED_URL    = "https://steady.page/sebastian/rss";
export const PUBLICATION = "Blaupause";
export const AUTHOR      = "Sebastian Esser";
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

/* ------------------------------------------------------------------ CSS (Kit-Tokens) */

const CSS = `
:root{
  --font-sans:"DM Sans","CircularStd",Arial,sans-serif;
  --font-serif:"Lora",Georgia,serif;
  --text-base:18px; --text-h1:50px; --lh-h1:1.12; --text-card-title:18px; --text-nav:16px; --text-pill:12px;
  --weight-heading:700; --weight-body:400;
  --color-ink:#291E38; --color-ink-soft:#6B6577; --color-brand:#137EC0; --color-accent:#FF7264;
  --color-line:#9A95A6; --color-hairline:#ECEAEF; --color-bg:#FFFFFF;
  --radius-btn:1px; --radius-card:0; --radius-pill:20px; --container:1024px; --reading:620px;
}
*,*::before,*::after{box-sizing:border-box;}
html{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
body{margin:0;background:var(--color-bg);color:var(--color-ink);font-family:var(--font-sans);
     font-size:var(--text-base);font-weight:var(--weight-body);line-height:1.5;}
a{color:inherit;text-decoration:none;} img{display:block;max-width:100%;}
.container{max-width:var(--container);margin:0 auto;padding:0 24px;}
.btn{display:inline-block;font:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;
     text-transform:uppercase;padding:11px 20px;border:1px solid transparent;cursor:pointer;border-radius:var(--radius-btn);}
.btn--primary{background:var(--color-brand);color:#fff;}
.btn--outline{background:#fff;color:var(--color-ink);border-color:#d7d4dd;}
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
/* hero */
.hero{padding:56px 0 44px;}
.hero__grid{display:grid;grid-template-columns:1.25fr 1fr;gap:48px;align-items:center;}
.eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;
         letter-spacing:.1em;text-transform:uppercase;color:var(--color-ink);margin-bottom:18px;}
.eyebrow svg{width:13px;height:13px;}
.hero__title{font-size:var(--text-h1);line-height:var(--lh-h1);font-weight:var(--weight-heading);margin:0 0 18px;letter-spacing:-.01em;}
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
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:36px 30px;padding-bottom:48px;}
.card__media{width:100%;aspect-ratio:16/9;background:var(--color-line);border-radius:var(--radius-card);object-fit:cover;}
.card__title{font-size:var(--text-card-title);font-weight:700;line-height:1.3;margin:14px 0 0;transition:color .15s;}
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
.post__title{font-size:48px;line-height:1.12;font-weight:var(--weight-heading);letter-spacing:-.01em;margin:0 0 20px;}
.post__engagement{display:flex;align-items:center;gap:24px;color:var(--color-line);font-size:14px;}
.post__engagement span{display:inline-flex;align-items:center;gap:7px;} .post__engagement svg{width:18px;height:18px;}
.post__byline{font-size:14px;color:var(--color-line);margin:14px 0 0;padding-bottom:26px;border-bottom:1px solid var(--color-hairline);}
.post__figure{margin:30px 0;} .post__figure img{width:100%;border-radius:var(--radius-card);background:var(--color-line);}
.post__body{font-family:var(--font-serif);font-size:22px;line-height:1.45;color:var(--color-ink);}
.post__body p{margin:0 0 26px;} .post__body p.lede{font-weight:600;}
.post__readon{margin:14px 0 8px;}
/* footer */
.site-footer{border-top:1px solid var(--color-hairline);padding:40px 0 56px;margin-top:40px;}
.footer__inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;}
.footer__brand{display:flex;align-items:center;gap:14px;}
.footer__wordmark{height:22px;width:auto;opacity:.9;} .footer__by{font-size:14px;color:var(--color-line);}
.footer__links{display:flex;flex-wrap:wrap;gap:20px;font-size:14px;color:var(--color-ink-soft);}
.footer__lang{font-size:14px;color:var(--color-ink-soft);border:1px solid var(--color-hairline);padding:7px 12px;border-radius:2px;}
@media (max-width:900px){.hero__grid{grid-template-columns:1fr;gap:28px;}.grid{grid-template-columns:repeat(2,1fr);}:root{--text-h1:38px;}}
@media (max-width:680px){.post__title{font-size:34px;}.post__body{font-size:20px;}}
@media (max-width:560px){.grid{grid-template-columns:1fr;}.header-actions .btn--outline{display:none;}}
`;

/* ------------------------------------------------------------------ SVG-Icons */

const ICON_PIN  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3l5 5-2 2-1-1-4 4 1 4-2 2-4-4-5 5-1-1 5-5-4-4 2-2 4 1 4-4-1-1z"/></svg>`;
const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>`;
const ICON_CLAP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 11V6a2 2 0 1 1 4 0v4m0 0V4a2 2 0 1 1 4 0v6m0 0V6a2 2 0 1 1 4 0v8a6 6 0 0 1-6 6h-1a7 7 0 0 1-6-3.5L3 16a2 2 0 0 1 3-2.6L9 15"/></svg>`;
const ICON_EYE  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_SHARE= `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>`;

/* ------------------------------------------------------------------ Chrome */

function head(title, { serif = false } = {}) {
  const fonts = serif
    ? "family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Lora:ital,wght@0,400;0,600;1,400"
    : "family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700";
  return `<!DOCTYPE html><html lang="de"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<link rel="icon" href="/assets/favicon.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet"/>
<style>${CSS}</style></head><body>`;
}
function header({ tabs = false } = {}) {
  const nav = tabs ? `
<nav class="tabs"><div class="container tabs__inner">
  <a class="tab tab--active" href="/">Posts</a>
  <a class="tab" href="/#memberships">Memberships</a>
</div></nav>` : "";
  return `<header class="site-header"><div class="container site-header__inner">
  <a class="brand" href="/"><img class="brand__logo" alt="${esc(PUBLICATION)}" src="/assets/logo.png"/>
  <span class="brand__name">${esc(PUBLICATION)}</span></a>
  <div class="header-actions">
    <a class="btn btn--primary" href="/#memberships">Subscribe</a>
    <a class="btn btn--outline" href="#">Log in</a>
  </div></div></header>${nav}`;
}
function footer() {
  return `<footer class="site-footer"><div class="container footer__inner">
  <div class="footer__brand"><img class="footer__wordmark" alt="Steady" src="/assets/steady-wordmark.svg"/>
  <span class="footer__by">by ${esc(AUTHOR)}</span></div>
  <nav class="footer__links"><a href="#">Imprint</a><a href="#">Privacy Policy</a>
  <a href="#">Terms &amp; Conditions</a><a href="#">Help</a><a href="#">Discover Steady</a></nav>
  <span class="footer__lang">English ▾</span></div></footer></body></html>`;
}

/* ------------------------------------------------------------------ Pages */

export function renderLanding(items, page = 1) {
  if (!items.length) return renderEmpty();

  const heroIdx = PINNED_GUID ? Math.max(0, items.findIndex(i => i.guid === PINNED_GUID)) : 0;
  const hero = items[heroIdx];
  const rest = items.filter((_, i) => i !== heroIdx);

  const pills = topCategories(items)
    .map(c => `<span class="pill">${esc(c)}</span>`).join("");

  const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const p = Math.min(Math.max(1, page), pages);
  const slice = rest.slice((p - 1) * PER_PAGE, p * PER_PAGE);

  const cards = slice.map(it => `
    <a class="card" href="/posts/${esc(it.guid)}">
      <img class="card__media" loading="lazy" alt="" src="${teaser(it.image, 800, 450)}"/>
      <h3 class="card__title">${esc(it.title)}</h3>
      ${it.description ? `<p class="card__excerpt">${esc(it.description)}</p>` : ""}
      <div class="card__date">${esc(fmtDate(it.pubDate))}</div>
    </a>`).join("");

  const pag = renderPagination(p, pages);

  return head(PUBLICATION) + header({ tabs: true }) + `
<main>
<section class="hero"><div class="container hero__grid">
  <div class="hero__body">
    <span class="eyebrow">${ICON_PIN} Pinned post</span>
    <h1 class="hero__title"><a href="/posts/${esc(hero.guid)}">${esc(hero.title)}</a></h1>
    ${hero.description ? `<p class="hero__excerpt">${esc(hero.description)}</p>` : ""}
    <div class="hero__date">${esc(fmtDate(hero.pubDate))}</div>
  </div>
  <a class="hero__medialink" href="/posts/${esc(hero.guid)}">
    <img class="hero__media" alt="" src="${teaser(hero.image, 760, 570)}"/>
  </a>
</div></section>
<div class="container">
  <div class="pills">${pills}</div>
  <div class="grid">${cards}</div>
  ${pag}
  <div id="memberships"></div>
  <!-- #memberships: Andock-Punkt für das echte Steady-Membership-/Checkout-Widget. -->
</div>
</main>` + footer();
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

export function renderPost(item) {
  return head(`${item.title} — ${PUBLICATION}`, { serif: true }) + header({ tabs: false }) + `
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

export function renderEmpty() {
  return head(PUBLICATION) + header({ tabs: true }) +
    `<main><div class="container" style="padding:80px 0;color:var(--color-line)">Inhalte laden gerade nicht. Bitte gleich neu laden.</div></main>` +
    footer();
}

export function render404() {
  return head("Nicht gefunden — " + PUBLICATION) + header({ tabs: false }) +
    `<main><div class="container" style="padding:80px 0"><h1 style="font-size:32px">Beitrag nicht gefunden</h1>
     <p style="color:var(--color-ink-soft)"><a class="btn btn--primary" href="/" style="margin-top:12px">Zur Startseite</a></p></div></main>` +
    footer();
}
