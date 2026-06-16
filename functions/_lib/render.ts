// _lib/render.ts — page renderer: feed items + render cfg → complete HTML.
//
// Composition of the landing (renderLanding):
//   1. Head    — portal band (lead story + rails) OR single-column hero/lead story
//   2. Stream  — section blocks OR a flat list with pills + "load more"
// The top section distributes teasers DISJOINTLY (hero, lead row, latest, most-read),
// so no post appears twice at the top.

import { PUBLICATION, PER_PAGE, PINNED_GUID, MEMBER_HEADING, publicationName } from "./config.ts";
import { t } from "./i18n.ts";
import { esc, fmtDate, slugify, teaser } from "./util.ts";
import { normTitle, topCategories } from "./feed.ts";
import { ICON_BACK, ICON_CLAP, ICON_SHARE } from "./icons.ts";
import { head, header, footer } from "./page.ts";
import type { FeedItem, RenderCfg } from "./types.ts";

// Official Steady paywall element: for non-members the Smart Layers widget hides
// everything BELOW this element and shows the paywall (configured in the Steady
// backend); paying members see the content. Source: help.steadyhq.com, JS paywall.
const STEADY_PAYWALL_MARKER = `<div id="steady_paywall" style="display: none;"></div>`;

/* ------------------------------------------------------------------ building blocks */

// Category pill as a link to the section page
function pill(c: string): string { return `<a class="pill" href="/rubrik/${slugify(c)}">${esc(c)}</a>`; }

// Teaser card (flat list, sections, lead row)
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

// Lead story "klein" = split hero (text left, image right)
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

// rough reading-time estimate from the teaser text (the feed has no full text)
function readMin(it: FeedItem): number {
  const w = (it.description || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(w / 35));
}

// Lead story "gross" = stacked: headline + excerpt + meta bar + image.
// side=true → image to the left of the text (section pages).
function aufmacherArticle(hero: FeedItem, withImage: boolean, side: boolean = false, titleTag: "h1" | "h2" = "h1"): string {
  const media = withImage ? `<a class="aufmacher__medialink" href="/posts/${esc(hero.guid)}"><img class="aufmacher__media" alt="" src="${teaser(hero.image, 1120, 630)}"/></a>` : "";
  const body = `<div class="aufmacher__body">
    <${titleTag} class="aufmacher__title"><a href="/posts/${esc(hero.guid)}">${esc(hero.title)}</a></${titleTag}>
    ${hero.description ? `<p class="aufmacher__excerpt">${esc(hero.description)}</p>` : ""}
    <div class="aufmacher__meta"><span>${esc(fmtDate(hero.pubDate))}</span><span>${esc(t("read.min", { min: readMin(hero) }))}</span></div>
  </div>`;
  return `<article class="aufmacher${side ? " aufmacher--side" : ""}">${side ? media + body : body + media}</article>`;
}

/* — Portal rails (modules of the 3-column shell) — */

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

// Portal band: rails flank the lead story (latest/topics left, most-read right).
// railItems = {latest, popular} — disjoint slices from renderLanding.
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

/* — Section stream (section teasers) — */

// Horizontal mini teaser (image left) for the feature list
function teaserRow(it: FeedItem): string {
  return `<a class="teaser-row" href="/posts/${esc(it.guid)}">
    <img class="teaser-row__media" loading="lazy" alt="" src="${teaser(it.image, 200, 200)}"/>
    <div><h4 class="teaser-row__title">${esc(it.title)}</h4><div class="card__date">${esc(fmtDate(it.pubDate))}</div></div>
  </a>`;
}
// Text teaser (no image) for the compact section
function teaserText(it: FeedItem): string {
  return `<a class="teaser-text" href="/posts/${esc(it.guid)}">
    <h4 class="teaser-text__title">${esc(it.title)}</h4>
    ${it.description ? `<p class="teaser-text__excerpt">${esc(it.description)}</p>` : ""}
    <div class="card__date">${esc(fmtDate(it.pubDate))}</div>
  </a>`;
}

// Stream by section — the layout rotates per section (feature / cards / compact, as in Figma).
// leadItems = a header-less teaser row right under the lead story, disjoint from the rails.
function rubrikStream(rest: FeedItem[], cats: string[], leadItems: FeedItem[], pins: Record<string, string[]>): string {
  if (!cats.length) return `<div class="grid">${rest.slice(0, PER_PAGE).map(card).join("")}</div>`;
  const MODES = ["feature", "cards", "compact"];
  const lead = (leadItems && leadItems.length)
    ? `<section class="rubrik rubrik--lead"><div class="grid rubrik__grid">${leadItems.map(card).join("")}</div></section>`
    : "";
  return lead + cats.map((cat, i) => {
    const slug = slugify(cat);
    // Each section has its own pin scope (rubrik/<slug>): it orders this section and
    // shares its pins with the section page. data-pin-scope tells the client the scope.
    const inCat = applyPins(rest.filter(it => it.categories.includes(cat)), pins && pins["rubrik/" + slug]);
    if (!inCat.length) return "";
    const head = `<header class="rubrik__head"><a class="rubrik__chip" href="/rubrik/${slug}">${esc(cat)}</a><a class="rubrik__more" href="/rubrik/${slug}">${esc(t("more.arrow"))}</a></header>`;
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
    return `<section class="rubrik rubrik--${mode}" data-pin-scope="rubrik/${slug}">${head}${body}</section>`;
  }).join("");
}

/**
 * Pull pinned posts (in order, only those present in the feed, deduplicated) to the
 * front; the rest stays in feed order. Empty/missing list = unchanged.
 */
export function applyPins(items: FeedItem[], guids?: string[]): FeedItem[] {
  if (!guids || !guids.length) return items;
  const byGuid = new Map(items.map(it => [it.guid, it]));
  const seen = new Set<string>();
  const pinned: FeedItem[] = [];
  for (const g of guids) {
    if (seen.has(g)) continue;
    const it = byGuid.get(g);
    if (it) { pinned.push(it); seen.add(g); }
  }
  if (!pinned.length) return items;
  return pinned.concat(items.filter(it => !seen.has(it.guid)));
}

/* ------------------------------------------------------------------ pages */

/** Landing (/): composition per cfg — default is single-column / split hero / list. */
export function renderLanding(items: FeedItem[], page: number = 1, cfg: RenderCfg): string {
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [], pins: {} } as unknown as RenderCfg;
  if (!items.length) return renderEmpty(cfg);

  const pinList = (cfg.pins && cfg.pins["/"]) || [];
  const items2 = applyPins(items, pinList);
  // pinsApplied only when at least one pin was actually in the feed (otherwise
  // applyPins returns the same reference) — if all pins are stale, PINNED_GUID still applies.
  const pinsApplied = items2 !== items;
  const heroIdx = pinsApplied ? 0 : (PINNED_GUID ? Math.max(0, items2.findIndex(i => i.guid === PINNED_GUID)) : 0);
  const hero = items2[heroIdx];
  const rest = items2.filter((_, i) => i !== heroIdx);
  const cats = topCategories(items2);
  // Distribute the top-section teasers disjointly so no teaser appears twice:
  // the lead row (under the lead story) gets the freshest, then latest/most-read.
  const leadItems    = rest.slice(0, 4);
  const latestItems  = rest.slice(4, 7);
  const popularItems = rest.slice(7, 10);

  // 1) Head: portal band (with rails) or single-column lead story/hero
  let top;
  if (cfg.shell === "portal") {
    top = portalBand(cfg, aufmacherArticle(hero, cfg.auf === "gross"), { latest: latestItems, popular: popularItems }, cats);
  } else if (cfg.auf === "gross") {
    top = `<section class="aufmacher-band"><div class="container">${aufmacherArticle(hero, true)}</div></section>`;
  } else {
    top = heroSplit(hero);
  }

  // 2) Stream: section blocks or a flat list with pills + "load more"
  let stream;
  if (cfg.stream === "rubrik") {
    stream = `<div class="container">${rubrikStream(rest, cats, leadItems, cfg.pins)}<div id="memberships"></div></div>`;
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
  <!-- #memberships: anchor point for the real Steady membership/checkout widget. -->
</div>`;
  }

  const meta = {
    desc: cfg.channelDesc || t("landing.desc", { name: publicationName(cfg) }),
    path: "/",
    image: hero.image ? teaser(hero.image, 1200, 630) : "",
  };
  return head(publicationName(cfg), cfg, meta) + header({ tabs: true, activePath: "/" }, cfg) + `
<main id="main">${top}${stream}</main>` + footer(cfg);
}

/** Section page (/rubrik/:slug): lead story (first post) + grid + "load more". */
export function renderSection(category: string, items: FeedItem[], allItems: FeedItem[], page: number = 1, cfg: RenderCfg): string {
  cfg = cfg || { shell: "single", auf: "klein", stream: "liste", rails: [], pins: {} } as unknown as RenderCfg;
  const slug = slugify(category);
  const display = category.charAt(0).toUpperCase() + category.slice(1);
  const ordered = applyPins(items, cfg.pins && cfg.pins["rubrik/" + slug]);
  const featured = ordered[0];
  const rest = ordered.slice(1);
  const pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const p = Math.min(Math.max(1, page), pages);
  const slice = rest.slice((p - 1) * PER_PAGE, p * PER_PAGE);
  const more = p < pages
    ? `<div class="loadmore-wrap"><button class="load-more" id="js-loadmore" data-next="${p + 1}" data-pages="${pages}" data-url="/rubrik/${slug}">${esc(t("loadmore"))}</button></div>`
    : "";
  const count = items.length;
  const countLabel = t(count === 1 ? "rubrik.count.one" : "rubrik.count.other", { n: count });
  const aufmacher = featured ? `<section class="aufmacher-band"><div class="container">
    <header class="section-head">
      <a class="post__back" href="/">${ICON_BACK} ${esc(publicationName(cfg))}</a>
      <h1 class="section-title">${esc(display)}</h1>
      <p class="section-count">${esc(countLabel)}</p>
    </header>
    ${aufmacherArticle(featured, true, true, "h2")}
  </div></section>` : "";
  const meta = {
    desc: t("rubrik.desc", { category: display, name: publicationName(cfg) }),
    path: "/rubrik/" + slug,
    image: (featured && featured.image) ? teaser(featured.image, 1200, 630) : "",
  };
  return head(display + " — " + publicationName(cfg), cfg, meta) + header({ tabs: true, activePath: "/rubrik/" + slug }, cfg) + `
<main id="main">${aufmacher}<div class="container section-body">
  <div class="grid">${slice.map(card).join("")}</div>
  ${more}
  <div id="memberships"></div>
</div></main>` + footer(cfg);
}

// Embed a string literally into a RegExp (the member heading is publisher input
// from kit.config.js — special characters must not break the pattern).
function escapeRegExp(s: string): string {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Prepare the full-text HTML:
 *  1. strip the leading <h1> (title echo) and possibly the duplicated lede — we
 *     already show both in the page header,
 *  2. remove Steady-editor tints (<mark style="background…">) — they only mark the
 *     member section visually and clash with dark mode,
 *  3. before the member heading ("<memberHeading> 🔒") insert the official Steady
 *     paywall element → the widget takes over the gating.
 * `memberHeading` is parameterized (default: kit.config.js) so tests and differing
 * publications stay independent of the publisher file.
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
 * Single post (/posts/:id). `full` = full-text HTML from the authenticated feed
 * (content:encoded), joined by title — empty = teaser stub with a Steady link.
 * extras = {claps, prev, next}: clap counter (KV) + neighbor posts in feed order.
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

  // Neighbor navigation: next = newer, prev = older post (feed is newest first)
  const navLink = (p: { guid: string; title: string } | null, cls: string, label: string): string => p
    ? `<a class="post-nav__a ${cls}" href="/posts/${esc(p.guid)}"><em>${esc(label)}</em><span>${esc(p.title)}</span></a>`
    : `<span class="post-nav__spacer"></span>`;
  const postNav = (prev || next)
    ? `<nav class="post__col post-nav" aria-label="${esc(t("post.nav.aria"))}">
    ${navLink(next, "post-nav__a--next", t("post.nav.newer"))}
    ${navLink(prev, "post-nav__a--prev", t("post.nav.older"))}
  </nav>`
    : "";

  // Engagement-Modus bestimmt den Inhalt des Post-Fußes (Clap, App-Container oder nichts)
  const mode = (cfg.engagement && cfg.engagement.mode) || "claps";
  const shareBtn =
    `<button class="post__share" id="js-share" type="button" data-title="${esc(item.title)}">${ICON_SHARE}<span id="js-share-t">${esc(t("post.share"))}</span></button>`;
  let engageInner: string;
  if (mode === "steady-app") {
    const app = cfg.engagement.appUrl || "";
    engageInner =
      `<div class="post__engage" data-engage-key="${esc(item.link)}" data-engage-app="${esc(app)}"` +
      ` data-l-cta="${esc(t("engage.cta"))}" data-l-empty="${esc(t("engage.cta.empty"))}"` +
      ` data-l-comments="${esc(t("engage.comments.other", { n: "{n}" }))}" data-l-comments-one="${esc(t("engage.comments.one", { n: "{n}" }))}"` +
      ` data-l-reactions="${esc(t("engage.reactions", { n: "{n}" }))}"` +
      ` data-l-hi="${esc(t("engage.highlighted"))}" data-l-err="${esc(t("engage.loaderr"))}"></div>${shareBtn}`;
  } else if (mode === "none") {
    // Nur Teilen-Button, kein Clap-Button
    engageInner = shareBtn;
  } else {
    // Standardmodus: Clap-Button + Teilen-Button
    engageInner = `<button class="post__clap" id="js-clap" type="button" data-guid="${esc(item.guid)}" aria-label="${esc(t("post.clap.aria"))}">${ICON_CLAP}<span id="js-clap-n">${claps}</span></button>${shareBtn}`;
  }
  const foot = `<div class="post__col post__foot"><div class="post__react">${engageInner}</div></div>`;

  const meta = {
    desc: item.description || "",
    path: "/posts/" + item.guid,
    image: item.image ? teaser(item.image, 1200, 630) : "",
    type: "article",
  };
  return head(`${item.title} — ${publicationName(cfg)}`, cfg, meta) + header({ tabs: true, activePath: "" }, cfg) + `
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
  ${foot}
  ${postNav}
</article></main>` + footer(cfg);
}

/** Fallback when the feed is unreachable. */
export function renderEmpty(cfg: RenderCfg = {} as RenderCfg): string {
  return head(publicationName(cfg), cfg, { noindex: true }) + header({ tabs: true, activePath: "/" }, cfg) +
    `<main id="main"><div class="container" style="padding:80px 0;color:var(--color-ink-soft)">${esc(t("empty"))}</div></main>` +
    footer(cfg);
}

/** /memberships: Steady renders the checkout into the container (backend checkout URL). */
export function renderMemberships(cfg: RenderCfg = {} as RenderCfg): string {
  const meta = { desc: t("memberships.desc", { name: publicationName(cfg) }), path: "/memberships" };
  return head(t("memberships.title") + " — " + publicationName(cfg), cfg, meta) + header({ tabs: true, activePath: "/memberships" }, cfg) + `
<main id="main"><div class="container" style="padding:48px 0 72px">
  <h1 style="font-family:var(--font-head);font-size:34px;font-weight:var(--weight-heading);text-align:center;letter-spacing:-.01em;margin:0 0 10px">${esc(t("memberships.title"))}</h1>
  <p style="text-align:center;color:var(--color-ink-soft);font-size:18px;margin:0 0 40px">${esc(t("memberships.sub"))}</p>
  <!-- Steady renders the checkout into this container (backend checkout URL = /memberships) -->
  <div id="insert_steady_checkout_here" style="display:none;"></div>
</div></main>` + footer(cfg);
}

export function render404(cfg: RenderCfg = {} as RenderCfg): string {
  return head(t("notfound.pagetitle") + " — " + publicationName(cfg), cfg, { noindex: true }) + header({ tabs: false }, cfg) +
    `<main id="main"><div class="container" style="padding:80px 0"><h1 style="font-size:32px">${esc(t("notfound.title"))}</h1>
     <p style="color:var(--color-ink-soft)"><a class="btn btn--primary" href="/" style="margin-top:12px">${esc(t("notfound.home"))}</a></p></div></main>` +
    footer(cfg);
}

/**
 * Onboarding page for unconfigured installations (kit.config.js without a slug,
 * no FEED_URL env override). Deliberately self-contained — no head()/header()/feed,
 * so it renders even when nothing else is set up yet.
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
