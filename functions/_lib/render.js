// _lib/render.js — Seiten-Renderer: Feed-Items + Render-cfg → komplettes HTML.
//
// Komposition der Landing (renderLanding):
//   1. Kopf      — Portal-Band (Aufmacher + Leisten) ODER einspaltiger Hero/Aufmacher
//   2. Stream    — Rubriken-Sektionen ODER flache Liste mit Pills + „Mehr laden"
// Die Top-Section verteilt Teaser DISJUNKT (Hero, Lead-Reihe, Neueste, Meistgelesen),
// damit kein Beitrag oben doppelt erscheint.

import { PUBLICATION, PER_PAGE, PINNED_GUID } from "./config.js";
import { esc, fmtDate, slugify, teaser } from "./util.js";
import { normTitle, topCategories } from "./feed.js";
import { ICON_BACK, ICON_CLAP, ICON_EYE, ICON_SHARE } from "./icons.js";
import { head, header, footer } from "./page.js";

/* ------------------------------------------------------------------ Bausteine */

// Kategorie-Pill als Link zur Rubrik-Seite
function pill(c) { return `<a class="pill" href="/rubrik/${slugify(c)}">${esc(c)}</a>`; }

// Teaser-Karte (flache Liste, Rubriken, Lead-Reihe)
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

// Aufmacher „klein" = Split-Hero (Text links, Bild rechts)
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

// grobe Lesezeit-Schätzung aus dem Teasertext (der Feed liefert keinen Volltext)
function readMin(it) {
  const w = (it.description || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(w / 35));
}

// Aufmacher „groß" = gestapelt: Headline + Excerpt + Meta-Leiste + Bild.
// side=true → Bild links neben dem Text (Rubrik-Seiten).
function aufmacherArticle(hero, withImage, side) {
  const media = withImage ? `<a class="aufmacher__medialink" href="/posts/${esc(hero.guid)}"><img class="aufmacher__media" alt="" src="${teaser(hero.image, 1120, 630)}"/></a>` : "";
  const body = `<div class="aufmacher__body">
    <h1 class="aufmacher__title"><a href="/posts/${esc(hero.guid)}">${esc(hero.title)}</a></h1>
    ${hero.description ? `<p class="aufmacher__excerpt">${esc(hero.description)}</p>` : ""}
    <div class="aufmacher__meta"><span>${esc(fmtDate(hero.pubDate))}</span><span>${readMin(hero)} Min Lesezeit</span></div>
  </div>`;
  return `<article class="aufmacher${side ? " aufmacher--side" : ""}">${side ? media + body : body + media}</article>`;
}

/* — Portal-Leisten (Module der 3-Spalten-Shell) — */

function railLatest(items) {
  return `<div class="rail-module"><h2 class="rail-module__title">Neueste Inhalte</h2>
    <ul class="rail-list">${items.slice(0, 3).map(it => `<li><a href="/posts/${esc(it.guid)}"><span class="rail-list__t">${esc(it.title)}</span><span class="rail-list__d">${esc(fmtDate(it.pubDate))}</span></a></li>`).join("")}</ul></div>`;
}
function railPopular(items) {
  return `<div class="rail-module"><h2 class="rail-module__title">Meistgelesen</h2>
    <ol class="rail-num">${items.slice(0, 3).map((it, i) => i === 0
      ? `<li class="rail-num__lead"><a href="/posts/${esc(it.guid)}"><span class="rail-num__n">1</span><img class="rail-num__media" loading="lazy" alt="" src="${teaser(it.image, 420, 236)}"/><span class="rail-num__t">${esc(it.title)}</span></a></li>`
      : `<li><a href="/posts/${esc(it.guid)}"><span class="rail-num__n">${i + 1}</span><span class="rail-num__t">${esc(it.title)}</span></a></li>`).join("")}</ol></div>`;
}
function railTopics(cats) {
  return `<div class="rail-module"><h2 class="rail-module__title">Meine Themen</h2>
    <div class="rail-pills">${cats.map(pill).join("")}</div></div>`;
}

// Portal-Band: Leisten flankieren den Aufmacher (Neueste/Themen links, Meistgelesen rechts).
// railItems = {latest, popular} — disjunkte Slices aus renderLanding.
function portalBand(cfg, centerHtml, railItems, cats) {
  const railL = [];
  if (cfg.rails.includes("neueste")) railL.push(railLatest(railItems.latest));
  if (cfg.rails.includes("themen")) railL.push(railTopics(cats));
  const railR = [];
  if (cfg.rails.includes("meist")) railR.push(railPopular(railItems.popular));
  const hasL = railL.length, hasR = railR.length;
  const cols = `${hasL ? "216px " : ""}minmax(0,1fr)${hasR ? " 216px" : ""}`;
  return `<section class="portal-band"><div class="portal-grid" style="grid-template-columns:${cols}">
    ${hasL ? `<aside class="rail rail--l">${railL.join("")}</aside>` : ""}
    <div class="portal-center">${centerHtml}</div>
    ${hasR ? `<aside class="rail rail--r">${railR.join("")}</aside>` : ""}
  </div></section>`;
}

/* — Rubrik-Stream (Sektions-Teaser) — */

// Horizontaler Mini-Teaser (Bild links) für die Feature-Liste
function teaserRow(it) {
  return `<a class="teaser-row" href="/posts/${esc(it.guid)}">
    <img class="teaser-row__media" loading="lazy" alt="" src="${teaser(it.image, 200, 200)}"/>
    <div><h4 class="teaser-row__title">${esc(it.title)}</h4><div class="card__date">${esc(fmtDate(it.pubDate))}</div></div>
  </a>`;
}
// Text-Teaser (ohne Bild) für die Kompakt-Sektion
function teaserText(it) {
  return `<a class="teaser-text" href="/posts/${esc(it.guid)}">
    <h4 class="teaser-text__title">${esc(it.title)}</h4>
    ${it.description ? `<p class="teaser-text__excerpt">${esc(it.description)}</p>` : ""}
    <div class="card__date">${esc(fmtDate(it.pubDate))}</div>
  </a>`;
}

// Stream nach Rubriken — das Layout rotiert je Sektion (Feature / Karten / Kompakt, wie im Figma).
// leadItems = headerlose Teaser-Reihe direkt unter dem Aufmacher, disjunkt zu den Leisten.
function rubrikStream(rest, cats, leadItems) {
  if (!cats.length) return `<div class="grid">${rest.slice(0, PER_PAGE).map(card).join("")}</div>`;
  const MODES = ["feature", "cards", "compact"];
  const lead = (leadItems && leadItems.length)
    ? `<section class="rubrik rubrik--lead"><div class="grid rubrik__grid">${leadItems.map(card).join("")}</div></section>`
    : "";
  return lead + cats.map((cat, i) => {
    const inCat = rest.filter(it => it.categories.includes(cat));
    if (!inCat.length) return "";
    const head = `<header class="rubrik__head"><a class="rubrik__chip" href="/rubrik/${slugify(cat)}">${esc(cat)}</a><a class="rubrik__more" href="/rubrik/${slugify(cat)}">Mehr →</a></header>`;
    const mode = MODES[i % 3];
    let body;
    if (mode === "feature") {
      const main = inCat[0];
      const list = inCat.slice(1, 5);
      body = `<div class="rubrik__feature">
        <a class="feat-main" href="/posts/${esc(main.guid)}">
          <img class="feat-main__media" loading="lazy" alt="" src="${teaser(main.image, 820, 540)}"/>
          <h3 class="feat-main__title">${esc(main.title)}</h3>
          ${main.description ? `<p class="feat-main__excerpt">${esc(main.description)}</p>` : ""}
          <div class="card__date">${esc(fmtDate(main.pubDate))}</div>
        </a>
        <div class="feat-list">${list.map(teaserRow).join("")}</div>
      </div>`;
    } else if (mode === "compact") {
      body = `<div class="rubrik__compact">${inCat.slice(0, 4).map(teaserText).join("")}</div>`;
    } else {
      body = `<div class="grid rubrik__grid">${inCat.slice(0, 4).map(card).join("")}</div>`;
    }
    return `<section class="rubrik rubrik--${mode}">${head}${body}</section>`;
  }).join("");
}

/* ------------------------------------------------------------------ Seiten */

/** Landing (/): Komposition laut cfg — Default ist einspaltig/Split-Hero/Liste. */
export function renderLanding(items, page = 1, cfg) {
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [] };
  if (!items.length) return renderEmpty(cfg);

  const heroIdx = PINNED_GUID ? Math.max(0, items.findIndex(i => i.guid === PINNED_GUID)) : 0;
  const hero = items[heroIdx];
  const rest = items.filter((_, i) => i !== heroIdx);
  const cats = topCategories(items);
  // Top-Section-Teaser disjunkt verteilen, damit kein Teaser doppelt erscheint:
  // Lead-Reihe (unter dem Aufmacher) bekommt die frischesten, dann Neueste/Meistgelesen.
  const leadItems    = rest.slice(0, 4);
  const latestItems  = rest.slice(4, 7);
  const popularItems = rest.slice(7, 10);

  // 1) Kopf: Portal-Band (mit Leisten) oder einspaltiger Aufmacher/Hero
  let top;
  if (cfg.shell === "portal") {
    top = portalBand(cfg, aufmacherArticle(hero, cfg.auf === "gross"), { latest: latestItems, popular: popularItems }, cats);
  } else if (cfg.auf === "gross") {
    top = `<section class="aufmacher-band"><div class="container">${aufmacherArticle(hero, true)}</div></section>`;
  } else {
    top = heroSplit(hero);
  }

  // 2) Stream: Rubriken-Sektionen oder flache Liste mit Pills + „Mehr laden"
  let stream;
  if (cfg.stream === "rubrik") {
    stream = `<div class="container">${rubrikStream(rest, cats, leadItems)}<div id="memberships"></div></div>`;
  } else {
    const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
    const p = Math.min(Math.max(1, page), pages);
    const slice = rest.slice((p - 1) * PER_PAGE, p * PER_PAGE);
    const pills = cats.map(pill).join("");
    const more = pages > 1
      ? `<div class="loadmore-wrap"><button class="load-more" id="js-loadmore" data-next="${p + 1}" data-pages="${pages}" data-url="/">Mehr laden</button></div>`
      : "";
    stream = `<div class="container">
  <div class="pills">${pills}</div>
  <div class="grid">${slice.map(card).join("")}</div>
  ${more}
  <div id="memberships"></div>
  <!-- #memberships: Andock-Punkt für das echte Steady-Membership-/Checkout-Widget. -->
</div>`;
  }

  return head(PUBLICATION, cfg) + header({ tabs: true, activePath: "/" }, cfg) + `
<main>${top}${stream}</main>` + footer();
}

/** Rubrik-Seite (/rubrik/:slug): Aufmacher (erster Beitrag) + Raster + „Mehr laden". */
export function renderSection(category, items, allItems, page = 1, cfg) {
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [] };
  const slug = slugify(category);
  const display = category.charAt(0).toUpperCase() + category.slice(1);
  const featured = items[0];
  const rest = items.slice(1);
  const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const p = Math.min(Math.max(1, page), pages);
  const slice = rest.slice((p - 1) * PER_PAGE, p * PER_PAGE);
  const more = p < pages
    ? `<div class="loadmore-wrap"><button class="load-more" id="js-loadmore" data-next="${p + 1}" data-pages="${pages}" data-url="/rubrik/${slug}">Mehr laden</button></div>`
    : "";
  const aufmacher = featured ? `<section class="aufmacher-band"><div class="container">
    <p class="section-eyebrow"><a class="post__back" href="/">${ICON_BACK} ${esc(PUBLICATION)}</a><span class="section-chip">${esc(display)}</span></p>
    ${aufmacherArticle(featured, true, true)}
  </div></section>` : "";
  return head(display + " — " + PUBLICATION, cfg) + header({ tabs: true, activePath: "/rubrik/" + slug }, cfg) + `
<main>${aufmacher}<div class="container section-body">
  <div class="grid">${slice.map(card).join("")}</div>
  ${more}
  <div id="memberships"></div>
</div></main>` + footer();
}

/**
 * Einzelpost (/posts/:id). `full` = Volltext-HTML aus dem authentifizierten Feed
 * (content:encoded), per Titel gejoint — leer = Teaser-Stub mit Steady-Link.
 */
export function renderPost(item, cfg = {}, full = "") {
  // Volltext aufbereiten: Steady stellt den Titel als führendes <h1> und die Lede als
  // erstes <p> voran. Beides zeigen wir bereits im Kopf — aus dem Body entfernen,
  // damit nichts doppelt erscheint.
  let fullClean = "";
  if (full) {
    fullClean = full.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
    if (item.description) {
      const fp = fullClean.match(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*/i);
      if (fp) {
        const pt = normTitle(fp[1].replace(/<[^>]+>/g, " "));
        const dt = normTitle(item.description);
        if (pt && dt && (pt.indexOf(dt.slice(0, 36)) === 0 || dt.indexOf(pt.slice(0, 36)) === 0))
          fullClean = fullClean.slice(fp[0].length);
      }
    }
  }
  const cat = (item.categories && item.categories.find(c => c && c.trim())) || "Newsletter";
  const heroImg = item.image
    ? `<figure class="post__hero"><img alt="" src="${teaser(item.image, 1600, 1200)}"/></figure>` : "";
  const bodyInner = full
    ? `<div class="post__body post__body--full">${fullClean}</div>`
    : `<div class="post__body"><p>Dieser Beitrag erscheint im Original auf Steady. Den vollständigen Text
         liest du dort — inklusive Mitglieder-Inhalten.</p></div>`;
  const cta = full ? "Auf Steady öffnen" : "Ganzen Beitrag auf Steady lesen";
  return head(`${item.title} — ${PUBLICATION}`, cfg) + header({ tabs: true, activePath: "" }, cfg) + `
<main><article class="post">
  <div class="post__col">
    <a class="pill post__eyebrow" href="/rubrik/${slugify(cat)}">${esc(cat)}</a>
    <h1 class="post__title">${esc(item.title)}</h1>
    ${item.description ? `<p class="post__lede">${esc(item.description)}</p>` : ""}
    <div class="post__meta">${esc(fmtDate(item.pubDate))}</div>
  </div>
  ${heroImg}
  <div class="post__col post__bodywrap">
    ${bodyInner}
    <p class="post__readon"><a class="btn btn--primary" href="${esc(item.link)}">${cta}</a></p>
  </div>
  <div class="post__col post__foot">
    <div class="post__react">
      <span class="post__live" aria-hidden="true"></span>
      <span class="ri">${ICON_CLAP}0</span>
      <span class="ri">${ICON_EYE}0</span>
      <span class="ri">${ICON_SHARE}Share</span>
    </div>
  </div>
</article></main>` + footer();
}

/** Fallback, wenn der Feed nicht erreichbar ist. */
export function renderEmpty(cfg = {}) {
  return head(PUBLICATION, cfg) + header({ tabs: true, activePath: "/" }, cfg) +
    `<main><div class="container" style="padding:80px 0;color:var(--color-ink-soft)">Inhalte laden gerade nicht. Bitte gleich neu laden.</div></main>` +
    footer();
}

/** /memberships: Steady rendert den Checkout in den Container (Backend-Checkout-URL). */
export function renderMemberships(cfg = {}) {
  return head("Mitglied werden — " + PUBLICATION, cfg) + header({ tabs: true, activePath: "/memberships" }, cfg) + `
<main><div class="container" style="padding:48px 0 72px">
  <h1 style="font-family:var(--font-head);font-size:34px;font-weight:var(--weight-heading);text-align:center;letter-spacing:-.01em;margin:0 0 10px">Mitglied werden</h1>
  <p style="text-align:center;color:var(--color-ink-soft);font-size:18px;margin:0 0 40px">Wähle deine Mitgliedschaft — der Checkout läuft direkt hier auf der Seite.</p>
  <!-- Steady rendert den Checkout in diesen Container (Backend Checkout-URL = /memberships) -->
  <div id="insert_steady_checkout_here" style="display:none;"></div>
</div></main>` + footer();
}

export function render404(cfg = {}) {
  return head("Nicht gefunden — " + PUBLICATION, cfg) + header({ tabs: false }, cfg) +
    `<main><div class="container" style="padding:80px 0"><h1 style="font-size:32px">Beitrag nicht gefunden</h1>
     <p style="color:var(--color-ink-soft)"><a class="btn btn--primary" href="/" style="margin-top:12px">Zur Startseite</a></p></div></main>` +
    footer();
}
