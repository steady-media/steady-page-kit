// _lib/render.js — Seiten-Renderer: Feed-Items + Render-cfg → komplettes HTML.
//
// Komposition der Landing (renderLanding):
//   1. Kopf      — Portal-Band (Aufmacher + Leisten) ODER einspaltiger Hero/Aufmacher
//   2. Stream    — Rubriken-Sektionen ODER flache Liste mit Pills + „Mehr laden"
// Die Top-Section verteilt Teaser DISJUNKT (Hero, Lead-Reihe, Neueste, Meistgelesen),
// damit kein Beitrag oben doppelt erscheint.

import { PUBLICATION, PER_PAGE, PINNED_GUID, MEMBER_HEADING } from "./config.ts";
import { t } from "./i18n.ts";
import { esc, fmtDate, slugify, teaser } from "./util.ts";
import { normTitle, topCategories } from "./feed.ts";
import { ICON_BACK, ICON_CLAP, ICON_SHARE } from "./icons.ts";
import { head, header, footer } from "./page.ts";
import type { FeedItem, RenderCfg } from "./types.ts";

// Offizielles Steady-Paywall-Element: Das Smart-Layer-Widget blendet für Nicht-Mitglieder
// alles UNTERHALB dieses Elements aus und zeigt die (im Steady-Backend konfigurierte)
// Paywall; zahlende Mitglieder sehen den Inhalt. Quelle: help.steadyhq.com, JS-Paywall.
const STEADY_PAYWALL_MARKER = `<div id="steady_paywall" style="display: none;"></div>`;

/* ------------------------------------------------------------------ Bausteine */

// Kategorie-Pill als Link zur Rubrik-Seite
function pill(c: string): string { return `<a class="pill" href="/rubrik/${slugify(c)}">${esc(c)}</a>`; }

// Teaser-Karte (flache Liste, Rubriken, Lead-Reihe)
function card(it: FeedItem): string {
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
function heroSplit(hero: FeedItem): string {
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
function readMin(it: FeedItem): number {
  const w = (it.description || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(w / 35));
}

// Aufmacher „groß" = gestapelt: Headline + Excerpt + Meta-Leiste + Bild.
// side=true → Bild links neben dem Text (Rubrik-Seiten).
function aufmacherArticle(hero: FeedItem, withImage: boolean, side: boolean = false, titleTag: string = "h1"): string {
  const media = withImage ? `<a class="aufmacher__medialink" href="/posts/${esc(hero.guid)}"><img class="aufmacher__media" alt="" src="${teaser(hero.image, 1120, 630)}"/></a>` : "";
  const body = `<div class="aufmacher__body">
    <${titleTag} class="aufmacher__title"><a href="/posts/${esc(hero.guid)}">${esc(hero.title)}</a></${titleTag}>
    ${hero.description ? `<p class="aufmacher__excerpt">${esc(hero.description)}</p>` : ""}
    <div class="aufmacher__meta"><span>${esc(fmtDate(hero.pubDate))}</span><span>${esc(t("read.min", { min: readMin(hero) }))}</span></div>
  </div>`;
  return `<article class="aufmacher${side ? " aufmacher--side" : ""}">${side ? media + body : body + media}</article>`;
}

/* — Portal-Leisten (Module der 3-Spalten-Shell) — */

function railLatest(items: FeedItem[]): string {
  return `<div class="rail-module"><h2 class="rail-module__title">${t("rail.latest")}</h2>
    <ul class="rail-list">${items.slice(0, 3).map(it => `<li><a href="/posts/${esc(it.guid)}"><span class="rail-list__t">${esc(it.title)}</span><span class="rail-list__d">${esc(fmtDate(it.pubDate))}</span></a></li>`).join("")}</ul></div>`;
}
function railPopular(items: FeedItem[]): string {
  return `<div class="rail-module"><h2 class="rail-module__title">${t("rail.popular")}</h2>
    <ol class="rail-num">${items.slice(0, 3).map((it, i) => i === 0
      ? `<li class="rail-num__lead"><a href="/posts/${esc(it.guid)}"><span class="rail-num__n">1</span><img class="rail-num__media" loading="lazy" alt="" src="${teaser(it.image, 420, 236)}"/><span class="rail-num__t">${esc(it.title)}</span></a></li>`
      : `<li><a href="/posts/${esc(it.guid)}"><span class="rail-num__n">${i + 1}</span><span class="rail-num__t">${esc(it.title)}</span></a></li>`).join("")}</ol></div>`;
}
function railTopics(cats: string[]): string {
  return `<div class="rail-module"><h2 class="rail-module__title">${t("rail.topics")}</h2>
    <div class="rail-pills">${cats.map(pill).join("")}</div></div>`;
}

// Portal-Band: Leisten flankieren den Aufmacher (Neueste/Themen links, Meistgelesen rechts).
// railItems = {latest, popular} — disjunkte Slices aus renderLanding.
function portalBand(cfg: RenderCfg, centerHtml: string, railItems: { latest: FeedItem[]; popular: FeedItem[] }, cats: string[]): string {
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
function teaserRow(it: FeedItem): string {
  return `<a class="teaser-row" href="/posts/${esc(it.guid)}">
    <img class="teaser-row__media" loading="lazy" alt="" src="${teaser(it.image, 200, 200)}"/>
    <div><h4 class="teaser-row__title">${esc(it.title)}</h4><div class="card__date">${esc(fmtDate(it.pubDate))}</div></div>
  </a>`;
}
// Text-Teaser (ohne Bild) für die Kompakt-Sektion
function teaserText(it: FeedItem): string {
  return `<a class="teaser-text" href="/posts/${esc(it.guid)}">
    <h4 class="teaser-text__title">${esc(it.title)}</h4>
    ${it.description ? `<p class="teaser-text__excerpt">${esc(it.description)}</p>` : ""}
    <div class="card__date">${esc(fmtDate(it.pubDate))}</div>
  </a>`;
}

// Stream nach Rubriken — das Layout rotiert je Sektion (Feature / Karten / Kompakt, wie im Figma).
// leadItems = headerlose Teaser-Reihe direkt unter dem Aufmacher, disjunkt zu den Leisten.
function rubrikStream(rest: FeedItem[], cats: string[], leadItems: FeedItem[]): string {
  if (!cats.length) return `<div class="grid">${rest.slice(0, PER_PAGE).map(card).join("")}</div>`;
  const MODES = ["feature", "cards", "compact"];
  const lead = (leadItems && leadItems.length)
    ? `<section class="rubrik rubrik--lead"><div class="grid rubrik__grid">${leadItems.map(card).join("")}</div></section>`
    : "";
  return lead + cats.map((cat, i) => {
    const inCat = rest.filter(it => it.categories.includes(cat));
    if (!inCat.length) return "";
    const head = `<header class="rubrik__head"><a class="rubrik__chip" href="/rubrik/${slugify(cat)}">${esc(cat)}</a><a class="rubrik__more" href="/rubrik/${slugify(cat)}">${esc(t("more.arrow"))}</a></header>`;
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
export function renderLanding(items: FeedItem[], page: number = 1, cfg: RenderCfg): string {
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [] } as unknown as RenderCfg;
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
      ? `<div class="loadmore-wrap"><button class="load-more" id="js-loadmore" data-next="${p + 1}" data-pages="${pages}" data-url="/">${esc(t("loadmore"))}</button></div>`
      : "";
    stream = `<div class="container">
  <div class="pills">${pills}</div>
  <div class="grid">${slice.map(card).join("")}</div>
  ${more}
  <div id="memberships"></div>
  <!-- #memberships: Andock-Punkt für das echte Steady-Membership-/Checkout-Widget. -->
</div>`;
  }

  const meta = {
    desc: cfg.channelDesc || t("landing.desc", { name: PUBLICATION }),
    path: "/",
    image: hero.image ? teaser(hero.image, 1200, 630) : "",
  };
  return head(PUBLICATION, cfg, meta) + header({ tabs: true, activePath: "/" }, cfg) + `
<main id="main">${top}${stream}</main>` + footer();
}

/** Rubrik-Seite (/rubrik/:slug): Aufmacher (erster Beitrag) + Raster + „Mehr laden". */
export function renderSection(category: string, items: FeedItem[], allItems: FeedItem[], page: number = 1, cfg: RenderCfg): string {
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [] } as unknown as RenderCfg;
  const slug = slugify(category);
  const display = category.charAt(0).toUpperCase() + category.slice(1);
  const featured = items[0];
  const rest = items.slice(1);
  const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const p = Math.min(Math.max(1, page), pages);
  const slice = rest.slice((p - 1) * PER_PAGE, p * PER_PAGE);
  const more = p < pages
    ? `<div class="loadmore-wrap"><button class="load-more" id="js-loadmore" data-next="${p + 1}" data-pages="${pages}" data-url="/rubrik/${slug}">${esc(t("loadmore"))}</button></div>`
    : "";
  const aufmacher = featured ? `<section class="aufmacher-band"><div class="container">
    <p class="section-eyebrow"><a class="post__back" href="/">${ICON_BACK} ${esc(PUBLICATION)}</a><span class="section-chip">${esc(display)}</span></p>
    ${aufmacherArticle(featured, true, true, "h2")}
  </div></section>` : "";
  const meta = {
    desc: t("rubrik.desc", { category: display, name: PUBLICATION }),
    path: "/rubrik/" + slug,
    image: (featured && featured.image) ? teaser(featured.image, 1200, 630) : "",
  };
  return head(display + " — " + PUBLICATION, cfg, meta) + header({ tabs: true, activePath: "/rubrik/" + slug }, cfg) + `
<main id="main">${aufmacher}<div class="container section-body">
  <div class="grid">${slice.map(card).join("")}</div>
  ${more}
  <div id="memberships"></div>
</div></main>` + footer();
}

// String wörtlich in eine RegExp einbetten (die Mitglieder-Überschrift ist
// Publisher-Input aus kit.config.js — Sonderzeichen dürfen das Muster nicht brechen).
function escapeRegExp(s: string): string {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Volltext-HTML aufbereiten:
 *  1. führendes <h1> (Titel-Echo) und ggf. die doppelte Lede entfernen — beides
 *     zeigen wir bereits im Seitenkopf,
 *  2. Steady-Editor-Tönungen (<mark style="background…">) entfernen — sie markieren
 *     den Mitglieder-Teil nur visuell und kollidieren mit Dark Mode,
 *  3. vor der Mitglieder-Überschrift („<memberHeading> 🔒") das offizielle
 *     Steady-Paywall-Element einsetzen → das Widget übernimmt das Gating.
 * `memberHeading` ist parametrisiert (Default: kit.config.js), damit Tests und
 * abweichende Publikationen unabhängig von der Publisher-Datei bleiben.
 */
export function prepareFullText(full: string, description: string, memberHeading: string = MEMBER_HEADING): string {
  let out = full.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
  if (description) {
    const fp = out.match(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*/i);
    if (fp) {
      const pt = normTitle(fp[1].replace(/<[^>]+>/g, " "));
      const dt = normTitle(description);
      if (pt && dt && (pt.indexOf(dt.slice(0, 36)) === 0 || dt.indexOf(pt.slice(0, 36)) === 0))
        out = out.slice(fp[0].length);
    }
  }
  out = out.replace(/<\/?mark\b[^>]*>/gi, "");
  const headingRe = new RegExp(`<h[23]\\b[^>]*>(?:(?!</h[23]>)[\\s\\S])*?${escapeRegExp(memberHeading)}`, "i");
  const m = out.search(headingRe);
  if (m >= 0) out = out.slice(0, m) + STEADY_PAYWALL_MARKER + out.slice(m);
  return out;
}

/**
 * Einzelpost (/posts/:id). `full` = Volltext-HTML aus dem authentifizierten Feed
 * (content:encoded), per Titel gejoint — leer = Teaser-Stub mit Steady-Link.
 * extras = {claps, prev, next}: Clap-Zähler (KV) + Nachbar-Posts in Feed-Reihenfolge.
 */
export function renderPost(item: FeedItem, cfg: RenderCfg = {} as RenderCfg, full: string = "", extras: { claps?: number; next?: { guid: string; title: string } | null; prev?: { guid: string; title: string } | null } = {}): string {
  const { claps = 0, prev = null, next = null } = extras;
  const fullClean = full ? prepareFullText(full, item.description) : "";
  const cat = (item.categories && item.categories.find(c => c && c.trim())) || t("post.fallbackCategory");
  const heroImg = item.image
    ? `<figure class="post__hero"><img alt="" src="${teaser(item.image, 1600, 1200)}"/></figure>` : "";
  const bodyInner = full
    ? `<div class="post__body post__body--full">${fullClean}</div>`
    : `<div class="post__body"><p>${esc(t("post.stub"))}</p></div>`;
  const cta = full ? t("post.open") : t("post.readfull");

  // Nachbar-Navigation: next = neuerer, prev = älterer Beitrag (Feed ist neueste zuerst)
  const navLink = (p: { guid: string; title: string } | null, cls: string, label: string): string => p
    ? `<a class="post-nav__a ${cls}" href="/posts/${esc(p.guid)}"><em>${esc(label)}</em><span>${esc(p.title)}</span></a>`
    : `<span class="post-nav__spacer"></span>`;
  const postNav = (prev || next)
    ? `<nav class="post__col post-nav" aria-label="${esc(t("post.nav.aria"))}">
    ${navLink(next, "post-nav__a--next", t("post.nav.newer"))}
    ${navLink(prev, "post-nav__a--prev", t("post.nav.older"))}
  </nav>`
    : "";

  const meta = {
    desc: item.description || "",
    path: "/posts/" + item.guid,
    image: item.image ? teaser(item.image, 1200, 630) : "",
    type: "article",
  };
  return head(`${item.title} — ${PUBLICATION}`, cfg, meta) + header({ tabs: true, activePath: "" }, cfg) + `
<main id="main"><article class="post">
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
      <button class="post__clap" id="js-clap" type="button" data-guid="${esc(item.guid)}" aria-label="${esc(t("post.clap.aria"))}">${ICON_CLAP}<span id="js-clap-n">${claps}</span></button>
      <button class="post__share" id="js-share" type="button" data-title="${esc(item.title)}">${ICON_SHARE}<span id="js-share-t">${esc(t("post.share"))}</span></button>
    </div>
  </div>
  ${postNav}
</article></main>` + footer();
}

/** Fallback, wenn der Feed nicht erreichbar ist. */
export function renderEmpty(cfg: RenderCfg = {} as RenderCfg): string {
  return head(PUBLICATION, cfg, { noindex: true }) + header({ tabs: true, activePath: "/" }, cfg) +
    `<main id="main"><div class="container" style="padding:80px 0;color:var(--color-ink-soft)">${esc(t("empty"))}</div></main>` +
    footer();
}

/** /memberships: Steady rendert den Checkout in den Container (Backend-Checkout-URL). */
export function renderMemberships(cfg: RenderCfg = {} as RenderCfg): string {
  const meta = { desc: t("memberships.desc", { name: PUBLICATION }), path: "/memberships" };
  return head(t("memberships.title") + " — " + PUBLICATION, cfg, meta) + header({ tabs: true, activePath: "/memberships" }, cfg) + `
<main id="main"><div class="container" style="padding:48px 0 72px">
  <h1 style="font-family:var(--font-head);font-size:34px;font-weight:var(--weight-heading);text-align:center;letter-spacing:-.01em;margin:0 0 10px">${esc(t("memberships.title"))}</h1>
  <p style="text-align:center;color:var(--color-ink-soft);font-size:18px;margin:0 0 40px">${esc(t("memberships.sub"))}</p>
  <!-- Steady rendert den Checkout in diesen Container (Backend Checkout-URL = /memberships) -->
  <div id="insert_steady_checkout_here" style="display:none;"></div>
</div></main>` + footer();
}

export function render404(cfg: RenderCfg = {} as RenderCfg): string {
  return head(t("notfound.pagetitle") + " — " + PUBLICATION, cfg, { noindex: true }) + header({ tabs: false }, cfg) +
    `<main id="main"><div class="container" style="padding:80px 0"><h1 style="font-size:32px">${esc(t("notfound.title"))}</h1>
     <p style="color:var(--color-ink-soft)"><a class="btn btn--primary" href="/" style="margin-top:12px">${esc(t("notfound.home"))}</a></p></div></main>` +
    footer();
}

/**
 * Onboarding-Seite für unkonfigurierte Installationen (kit.config.js ohne Slug,
 * kein FEED_URL-Env-Override). Bewusst self-contained — kein head()/header()/Feed,
 * damit sie auch dann rendert, wenn sonst noch gar nichts stimmt.
 */
export function renderOnboarding(): string {
  return `<!DOCTYPE html><html lang="de"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="robots" content="noindex"/>
<title>Steady Page Kit — Setup</title>
<style>
  body{margin:0;font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#16242f;background:#f5f7f9}
  .wrap{max-width:680px;margin:0 auto;padding:64px 24px}
  .card{background:#fff;border:1px solid #e3e8ec;border-radius:12px;padding:36px 40px;margin-bottom:20px}
  h1{font-size:26px;margin:0 0 6px}
  h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#137ec0;margin:0 0 14px}
  p{margin:0 0 12px}
  .say{display:inline-block;background:#eef6fb;border:1px solid #cfe6f4;border-radius:8px;padding:6px 14px;font-weight:600}
  code{background:#f0f3f5;border-radius:4px;padding:2px 6px;font-size:15px}
  .muted{color:#5d6f7c;font-size:15px}
</style></head><body><div class="wrap">
<div class="card">
  <h1>Steady Page Kit</h1>
  <p class="muted">Diese Seite ist noch nicht eingerichtet. / This site isn't set up yet.</p>
</div>
<div class="card">
  <h2>Deutsch</h2>
  <p>Öffne diesen Projektordner in deinem KI-Coding-Tool (Claude&nbsp;Code, Cursor, Codex, Gemini&nbsp;CLI, Amp&nbsp;…) und sage:</p>
  <p><span class="say">Richte meine Seite ein</span></p>
  <p class="muted">Der Agent fragt nach deiner Steady-Publikation, füllt <code>kit.config.js</code> aus und bringt die Seite live (Ablauf: <code>docs/agent/SETUP.md</code>). Ohne KI-Tool: <code>kit.config.js</code> von Hand ausfüllen — die Kommentare darin erklären jedes Feld.</p>
</div>
<div class="card">
  <h2>English</h2>
  <p>Open this project folder in your AI coding tool (Claude&nbsp;Code, Cursor, Codex, Gemini&nbsp;CLI, Amp&nbsp;…) and say:</p>
  <p><span class="say">Set up my page</span></p>
  <p class="muted">The agent asks for your Steady publication, fills in <code>kit.config.js</code> and takes the site live (see <code>docs/agent/SETUP.md</code>). No AI tool? Fill in <code>kit.config.js</code> manually — its comments explain every field.</p>
</div>
</div></body></html>`;
}
