// _lib/page.js — Seitengerüst: <head> (inkl. SEO/OG), Header (Brand + Login + Nav + Suche), Footer.
// Die Render-Funktionen (render.js) setzen Seiten als head() + header() + Inhalt + footer() zusammen.

import { PUBLICATION, SITE_ORIGIN, STEADY_PUBLICATION_ID, STEADY_LOGIN_URL, DEFAULT_NAV, ASSET_VERSION } from "./config.js";
import { LANGUAGE, LOCALE, t, clientStrings } from "./i18n.js";
import { esc } from "./util.js";
import { ICON_SEARCH } from "./icons.js";
import { panelHtml } from "./panel.js";

// JSON inline ins HTML: "<" escapen, damit kein "</script>" im Datenblob das Tag schließt.
const inlineJson = obj => JSON.stringify(obj).replace(/</g, "\\u003c");

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
export function head(title, cfg = {}, meta = {}) {
  const v = ASSET_VERSION;
  const origin = cfg.site || SITE_ORIGIN;
  const steadyId = cfg.steadyId || STEADY_PUBLICATION_ID;

  const kitGlobal = (cfg.skin && typeof cfg.skin === "object")
    ? `<script>window.KIT_GLOBAL=${inlineJson(cfg.skin)};</script>`
    : "";

  const tags = [];
  if (meta.desc) tags.push(`<meta name="description" content="${esc(meta.desc)}"/>`);
  if (meta.noindex) tags.push(`<meta name="robots" content="noindex"/>`);
  // canonical/og:url nur mit bekannter Origin (kit.config.js siteOrigin bzw.
  // SITE_ORIGIN-Env) — relative Canonicals stiften mehr Verwirrung als Nutzen.
  if (meta.path && origin) tags.push(`<link rel="canonical" href="${esc(origin + meta.path)}"/>`);
  tags.push(`<meta property="og:site_name" content="${esc(PUBLICATION)}"/>`);
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
<link rel="alternate" type="application/rss+xml" title="${esc(PUBLICATION)}" href="/rss"/>
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin/>
<link id="kit-font-css" href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/kit.css?v=${v}"/>
${kitGlobal}
<script src="/assets/kit-theme.js?v=${v}"></script>
<script>window.KIT_DEFAULT_BRAND=${inlineJson(PUBLICATION)};window.KIT_DEFAULT_NAV=${inlineJson(DEFAULT_NAV)};window.KIT_LANG=${inlineJson(LANGUAGE)};window.KIT_LOCALE=${inlineJson(LOCALE.intl)};window.KIT_I18N=${inlineJson(clientStrings())};</script>
<!-- Steady Smart Layers / Checkout / Paywall — der echte Steady-Layer.
     Ohne Publikations-ID kein Script-Tag (sonst lädt eine kaputte URL). -->
${steadyId ? `<script type="text/javascript" src="https://steady.page/widget_loader/${esc(steadyId)}"></script>` : ""}
${analytics}
</head><body>
<a class="skip-link" href="#main">${t("skip")}</a>`;
}

/** Navigations-Links; aktive Route wird markiert, externe öffnen im neuen Tab. */
function navLinksHtml(nav, activePath) {
  return nav.map(n => {
    const ext = n.x ? ` target="_blank" rel="noopener"` : "";
    const act = (!n.x && n.h === activePath) ? " tab--active" : "";
    return `<a class="tab${act}" href="${esc(n.h)}"${ext}>${esc(n.l)}</a>`;
  }).join("");
}

/**
 * Header: Brand (globales Logo aus KV oder Icon + Wortmarke), Steady-Login, optional
 * Tab-Navigation und die feed-basierte Suche (eigenes Modal, /api/search).
 * @param {{tabs?: boolean, activePath?: string}} opts
 * @param {object} cfg  Render-Config aus buildPageContext (settings.js)
 */
export function header({ tabs = false, activePath = "" } = {}, cfg = {}) {
  const center = cfg.headerStyle === "zentriert";
  const brand  = (cfg.brand && cfg.brand.trim()) ? cfg.brand : PUBLICATION;
  const nav    = (cfg.nav && cfg.nav.length) ? cfg.nav : DEFAULT_NAV;
  const loginUrl = cfg.loginUrl || STEADY_LOGIN_URL;
  const search = cfg.search
    ? `<span class="tabs__search" role="button" tabindex="0" aria-label="${t("search.aria")}">${ICON_SEARCH}</span>` : "";

  // Global gespeichertes Logo (KV) gewinnt für ALLE Besucher; sonst Default-Icon + Wortmarke.
  const lg = cfg.logo;
  const brandInner = (lg && lg.ts)
    ? `<img class="brand__logo-img" src="/api/logo?v=${lg.ts}" alt="${esc(brand)}"/>`
    : `<span class="brand__logo" role="img" aria-label="${esc(brand)}"></span><span class="brand__name">${esc(brand)}</span>`;
  const brandHtml = `<a class="brand" href="/" aria-label="${esc(brand)}">${brandInner}</a>`;

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

/** Seitenende: Anpassen-Button (FAB) + Customizer-Panel + Panel-Logik. */
export function footer() {
  return `<button class="cz-fab" id="cz-open" aria-label="${t("fab")}" title="${t("fab")}">✦</button>
${panelHtml()}
<script src="/assets/kit-panel.js?v=${ASSET_VERSION}"></script>
</body></html>`;
}
