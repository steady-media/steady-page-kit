// _lib/page.js — Seitengerüst: <head> (inkl. SEO/OG), Header (Brand + Login + Nav + Suche), Footer.
// Die Render-Funktionen (render.js) setzen Seiten als head() + header() + Inhalt + footer() zusammen.

import { PUBLICATION, SITE_ORIGIN, STEADY_PUBLICATION_ID, STEADY_LOGIN_URL, DEFAULT_NAV, ASSET_VERSION, publicationName } from "./config.ts";
import { LANGUAGE, LOCALE, t, clientStrings } from "./i18n.ts";
import { esc } from "./util.ts";
import { ICON_SEARCH } from "./icons.ts";
import { panelHtml } from "./panel.ts";
import type { RenderCfg, KitNavItem } from "./types.ts";

// Metadaten für SEO/OG-Tags im Dokumentkopf
type PageMeta = { desc?: string; path?: string; image?: string; type?: string; noindex?: boolean };

// JSON inline ins HTML: "<" escapen, damit kein "</script>" im Datenblob das Tag schließt.
const inlineJson = (obj: unknown): string => JSON.stringify(obj).replace(/</g, "\\u003c");

/**
 * Dokumentkopf. Reihenfolge ist bewusst:
 *   1. kit.css            — Design-Tokens + alle Komponenten-Styles
 *   2. window.KIT_GLOBAL  — global veröffentlichter Skin (nur wenn vorhanden)
 *   3. kit-theme.js       — blockierend: wendet KIT_GLOBAL/localStorage VOR dem
 *                           ersten Paint an (kein Theme-Flackern)
 *   4. Steady widget_loader — Smart Layers (Login/Checkout/Paywall)
 *
 * @param {string} title
 * @param {object} cfg   Render-Config aus buildPageContext (settings.js)
 * @param {{desc?:string, path?:string, image?:string, type?:string, noindex?:boolean}} meta
 *        SEO/Social-Metadaten: desc → description/og/twitter, path → canonical + og:url,
 *        image → og:image/twitter:image (absolute URL), type → og:type (Default website).
 */
export function head(title: string, cfg: RenderCfg = {} as RenderCfg, meta: PageMeta = {}): string {
  const v = ASSET_VERSION;
  const origin = cfg.site || SITE_ORIGIN;
  const steadyId = cfg.steadyId || STEADY_PUBLICATION_ID;
  const pub = publicationName(cfg);

  const kitGlobal = (cfg.skin && typeof cfg.skin === "object")
    ? `<script>window.KIT_GLOBAL=${inlineJson(cfg.skin)};</script>`
    : "";

  const tags = [];
  if (meta.desc) tags.push(`<meta name="description" content="${esc(meta.desc)}"/>`);
  if (meta.noindex) tags.push(`<meta name="robots" content="noindex"/>`);
  // canonical/og:url nur mit bekannter Origin (kit.config.js siteOrigin bzw.
  // SITE_ORIGIN-Env) — relative Canonicals stiften mehr Verwirrung als Nutzen.
  if (meta.path && origin) tags.push(`<link rel="canonical" href="${esc(origin + meta.path)}"/>`);
  tags.push(`<meta property="og:site_name" content="${esc(pub)}"/>`);
  tags.push(`<meta property="og:locale" content="${LOCALE.og}"/>`);
  tags.push(`<meta property="og:type" content="${esc(meta.type || "website")}"/>`);
  tags.push(`<meta property="og:title" content="${esc(title)}"/>`);
  if (meta.desc) tags.push(`<meta property="og:description" content="${esc(meta.desc)}"/>`);
  if (meta.path && origin) tags.push(`<meta property="og:url" content="${esc(origin + meta.path)}"/>`);
  if (meta.image) tags.push(`<meta property="og:image" content="${meta.image}"/>`);
  tags.push(`<meta name="twitter:card" content="${meta.image ? "summary_large_image" : "summary"}"/>`);
  tags.push(`<meta name="twitter:title" content="${esc(title)}"/>`);
  if (meta.desc) tags.push(`<meta name="twitter:description" content="${esc(meta.desc)}"/>`);
  if (meta.image) tags.push(`<meta name="twitter:image" content="${meta.image}"/>`);

  // Cloudflare Web Analytics — nur wenn ein Beacon-Token gesetzt ist (Secret ANALYTICS_TOKEN)
  const analytics = cfg.analytics
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(cfg.analytics)}"}'></script>`
    : "";

  return `<!DOCTYPE html><html lang="${LOCALE.html}"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
${tags.join("\n")}
<link rel="icon" href="/assets/favicon.png"/>
<link rel="alternate" type="application/rss+xml" title="${esc(pub)}" href="/rss"/>
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin/>
<link id="kit-font-css" href="https://fonts.bunny.net/css?family=inter:400,500,600,700,900&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/kit.css?v=${v}"/>
${kitGlobal}
<script src="/assets/kit-theme.js?v=${v}"></script>
<!-- Sicherheitsnetz: scheitert ein Teaser-/Hero-Bild beim Laden (tote URL, 403),
     auf die generische Marken-Grafik wechseln statt grauer Fläche. Capture-Phase,
     da error-Events nicht bubblen; data-fb verhindert Endlosschleifen. -->
<script>addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="IMG"&&!t.dataset.fb&&(/__media/.test(t.className)||(t.closest&&t.closest(".post__hero")))){t.dataset.fb=1;t.src="/assets/teaser-fallback.svg?v=${v}";}},true);</script>
<script>window.KIT_DEFAULT_BRAND=${inlineJson(pub)};window.KIT_DEFAULT_NAV=${inlineJson(DEFAULT_NAV)};window.KIT_LANG=${inlineJson(LANGUAGE)};window.KIT_LOCALE=${inlineJson(LOCALE.intl)};window.KIT_I18N=${inlineJson(clientStrings())};</script>
<!-- Steady Smart Layers / Checkout / Paywall — der echte Steady-Layer.
     Ohne Publikations-ID kein Script-Tag (sonst lädt eine kaputte URL). -->
${steadyId ? `<script type="text/javascript" src="https://steady.page/widget_loader/${esc(steadyId)}"></script>` : ""}
${analytics}
</head><body>
<a class="skip-link" href="#main">${t("skip")}</a>`;
}

/** Navigations-Links; aktive Route wird markiert, externe öffnen im neuen Tab. */
function navLinksHtml(nav: KitNavItem[], activePath: string): string {
  return nav.map((n: KitNavItem) => {
    const ext = n.x ? ` target="_blank" rel="noopener"` : "";
    const act = (!n.x && n.h === activePath) ? " tab--active" : "";
    return `<a class="tab${act}" href="${esc(n.h)}"${ext}>${esc(n.l)}</a>`;
  }).join("");
}

/**
 * Brand-Block: globales Logo aus KV oder Icon + Wortmarke (zentrierter Link auf /).
 * Wird sowohl im Header als auch im Footer verwendet — Markup byte-identisch.
 */
function brandBlock(cfg: RenderCfg, opts: { iconOnly?: boolean } = {}): string {
  const brand = publicationName(cfg);
  const lg = cfg.logo;
  // opts.iconOnly: nur das Marken-Icon, keine Wortmarke, kein KV-Logo (Footer).
  //   Der Name bleibt als aria-label am Link erhalten (Screenreader).
  let brandInner;
  if (opts.iconOnly) {
    brandInner = `<span class="brand__logo" role="img" aria-label="${esc(brand)}"></span>`;
  } else if (lg && lg.ts) {
    brandInner = `<img class="brand__logo-img" src="/api/logo?v=${lg.ts}" alt="${esc(brand)}"/>`;
  } else {
    brandInner = `<span class="brand__logo" role="img" aria-label="${esc(brand)}"></span><span class="brand__name">${esc(brand)}</span>`;
  }
  return `<a class="brand" href="/" aria-label="${esc(brand)}">${brandInner}</a>`;
}

/**
 * Header: Brand (globales Logo aus KV oder Icon + Wortmarke), Steady-Login, optional
 * Tab-Navigation und die feed-basierte Suche (eigenes Modal, /api/search).
 * @param {{tabs?: boolean, activePath?: string}} opts
 * @param {object} cfg  Render-Config aus buildPageContext (settings.js)
 */
export function header({ tabs = false, activePath = "" }: { tabs?: boolean; activePath?: string } = {}, cfg: RenderCfg = {} as RenderCfg): string {
  const center = cfg.headerStyle === "zentriert";
  const nav    = (cfg.nav && cfg.nav.length) ? cfg.nav : DEFAULT_NAV;
  const loginUrl = cfg.loginUrl || STEADY_LOGIN_URL;
  const search = cfg.search
    ? `<span class="tabs__search" role="button" tabindex="0" aria-label="${t("search.aria")}">${ICON_SEARCH}</span>` : "";

  const brandHtml = brandBlock(cfg);

  // Echter Steady-Login-Button (Smart Layer) — verhält sich exakt wie auf steady.page
  // (Login-Status, OAuth-Flow). Der Textlink ist Fallback, falls das Widget nicht lädt.
  const login = `<div class="header-actions"><a class="steady-login-button" data-size="small" data-language="${LANGUAGE}"></a><a class="login-link login-link--fb" id="js-login" href="${esc(loginUrl)}">${t("login.fallback")}</a></div>`;

  const navBar = tabs
    ? `<nav class="tabs${center ? " tabs--center" : ""}"><div class="container tabs__bar"><div class="tabs__inner">${navLinksHtml(nav, activePath)}</div>${search}</div></nav>`
    : "";

  // Feed-basierte Suche: eigenes <dialog>-Modal, befüllt von kit-panel.js über /api/search.
  const searchDialog = (tabs && cfg.search)
    ? `<dialog class="kit-search" id="kit-search" aria-label="${t("search.aria")}">
  <div class="kit-search__box">
    <input class="kit-search__in" id="kit-search-in" type="search" placeholder="${t("search.placeholder")}" autocomplete="off" spellcheck="false" aria-label="${t("search.term")}"/>
    <button class="kit-search__x" id="kit-search-close" type="button" aria-label="${t("search.close")}">×</button>
  </div>
  <div class="kit-search__res" id="kit-search-res"></div>
</dialog>`
    : "";

  // Mini-Inline-Snippet: zeigt den Fallback-Login-Link, falls das Steady-Widget nach 3 s
  // keinen Button gerendert hat (Adblocker, Ausfall).
  return `<header class="site-header${center ? " site-header--center" : ""}"><div class="container site-header__inner">
  ${brandHtml}
  ${login}
</div></header>${navBar}${searchDialog}<script>setTimeout(function(){try{var el=document.querySelector("steady-login-button");var ok=el&&el.shadowRoot&&el.shadowRoot.querySelector("a,button");if(!ok){var fb=document.getElementById("js-login");if(fb)fb.className+=" is-on";if(el)el.style.display="none";}}catch(e){}},3000);</script>`;
}

/** Seitenende: Site-Footer + Anpassen-Button (FAB) + Customizer-Panel + Panel-Logik. */
export function footer(cfg: RenderCfg = {} as RenderCfg): string {
  const footLinks = (cfg.foot && cfg.foot.length)
    ? `<nav class="site-footer__links" aria-label="Footer">${cfg.foot.map(n =>
        `<a class="footer-link" href="${esc(n.h)}"${n.x ? ' target="_blank" rel="noopener"' : ""}>${esc(n.l)}</a>`
      ).join("")}</nav>`
    : "";
  return `<footer class="site-footer"><div class="container site-footer__inner">
  ${brandBlock(cfg, { iconOnly: true })}
  ${footLinks}
</div></footer><button class="cz-fab" id="cz-open" aria-label="${t("fab")}" title="${t("fab")}">✦</button>
${panelHtml()}
<script src="/assets/kit-panel.js?v=${ASSET_VERSION}"></script>
</body></html>`;
}
