// _lib/page.js — Seitengerüst: <head>, Header (Brand + Login + Navigation), Footer.
// Die Render-Funktionen (render.js) setzen Seiten als head() + header() + Inhalt + footer() zusammen.

import { PUBLICATION, STEADY_PUBLICATION_ID, STEADY_LOGIN_URL, SEARCH_HOST, DEFAULT_NAV, ASSET_VERSION } from "./config.js";
import { esc } from "./util.js";
import { ICON_SEARCH } from "./icons.js";
import { panelHtml } from "./panel.js";

/**
 * Dokumentkopf. Reihenfolge ist bewusst:
 *   1. kit.css            — Design-Tokens + alle Komponenten-Styles
 *   2. window.KIT_GLOBAL  — global veröffentlichter Skin (nur wenn vorhanden)
 *   3. kit-theme.js       — blockierend: wendet KIT_GLOBAL/localStorage VOR dem
 *                           ersten Paint an (kein Theme-Flackern)
 *   4. Steady widget_loader — Smart Layers (Login/Checkout/Paywall)
 */
export function head(title, cfg = {}) {
  const v = ASSET_VERSION;
  // JSON inline ins HTML: "<" escapen, damit kein "</script>" im Datenblob das Tag schließt.
  const kitGlobal = (cfg.skin && typeof cfg.skin === "object")
    ? `<script>window.KIT_GLOBAL=${JSON.stringify(cfg.skin).replace(/</g, "\\u003c")};</script>`
    : "";
  return `<!DOCTYPE html><html lang="de"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<link rel="icon" href="/assets/favicon.png"/>
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin/>
<link id="kit-font-css" href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/assets/kit.css?v=${v}"/>
${kitGlobal}
<script src="/assets/kit-theme.js?v=${v}"></script>
<script>window.KIT_DEFAULT_BRAND=${JSON.stringify(PUBLICATION)};window.KIT_DEFAULT_NAV=${JSON.stringify(DEFAULT_NAV)};</script>
<!-- Steady Smart Layers / Checkout / Paywall — der echte Steady-Layer -->
<script type="text/javascript" src="https://steady.page/widget_loader/${STEADY_PUBLICATION_ID}"></script>
</head><body>`;
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
 * Tab-Navigation und Suche (Cloudflare AI Search).
 * @param {{tabs?: boolean, activePath?: string}} opts
 * @param {object} cfg  Render-Config aus buildPageContext (settings.js)
 */
export function header({ tabs = false, activePath = "" } = {}, cfg = {}) {
  const center = cfg.headerStyle === "zentriert";
  const brand  = (cfg.brand && cfg.brand.trim()) ? cfg.brand : PUBLICATION;
  const nav    = (cfg.nav && cfg.nav.length) ? cfg.nav : DEFAULT_NAV;
  const search = cfg.search
    ? `<span class="tabs__search" role="button" tabindex="0" aria-label="Suche">${ICON_SEARCH}</span>` : "";

  // Global gespeichertes Logo (KV) gewinnt für ALLE Besucher; sonst Default-Icon + Wortmarke.
  const lg = cfg.logo;
  const brandInner = (lg && lg.ts)
    ? `<img class="brand__logo-img" src="/api/logo?v=${lg.ts}" alt="${esc(brand)}"/>`
    : `<span class="brand__logo" role="img" aria-label="${esc(brand)}"></span><span class="brand__name">${esc(brand)}</span>`;
  const brandHtml = `<a class="brand" href="/" aria-label="${esc(brand)}">${brandInner}</a>`;

  // Echter Steady-Login-Button (Smart Layer) — verhält sich exakt wie auf steady.page
  // (Login-Status, OAuth-Flow). Der Textlink ist Fallback, falls das Widget nicht lädt.
  const login = `<div class="header-actions"><a class="steady-login-button" data-size="small" data-language="de"></a><a class="login-link login-link--fb" id="js-login" href="${STEADY_LOGIN_URL}">Login</a></div>`;

  const navBar = tabs
    ? `<nav class="tabs${center ? " tabs--center" : ""}"><div class="container tabs__bar"><div class="tabs__inner">${navLinksHtml(nav, activePath)}</div>${search}</div></nav>`
    : "";

  // Cloudflare AI Search nur laden, wenn die Suche aktiv ist. kit-search.js MUSS vor dem
  // Snippet-Modul stehen (fetch-Interceptor reichert die Treffer-Metadaten an).
  const searchAssets = (tabs && cfg.search)
    ? `<script src="/assets/kit-search.js?v=${ASSET_VERSION}"></script>` +
      `<script type="module" src="${SEARCH_HOST}/assets/v0.0.39/search-snippet.es.js"></script>` +
      `<search-modal-snippet api-url="${SEARCH_HOST}/" theme="light" placeholder="Suchen …" translations='{"navigateHint":"Navigieren","selectHint":"Auswählen","closeHint":"Schließen","closeAriaLabel":"Schließen","modalNoResultsTitle":"Keine Ergebnisse gefunden","noResultsTitle":"Keine Ergebnisse gefunden","emptyStateTitle":"Suche starten","poweredBy":"Bereitgestellt von","searchButtonLabel":"Suchen","searchInputAriaLabel":"Sucheingabe","searchResultsAriaLabel":"Suchergebnisse","loadingAriaLabel":"Lädt"}'></search-modal-snippet>`
    : "";

  // Mini-Inline-Snippet: zeigt den Fallback-Login-Link, falls das Steady-Widget nach 3 s
  // keinen Button gerendert hat (Adblocker, Ausfall).
  return `<header class="site-header${center ? " site-header--center" : ""}"><div class="container site-header__inner">
  ${brandHtml}
  ${login}
</div></header>${navBar}${searchAssets}<script>setTimeout(function(){try{var el=document.querySelector("steady-login-button");var ok=el&&el.shadowRoot&&el.shadowRoot.querySelector("a,button");if(!ok){var fb=document.getElementById("js-login");if(fb)fb.className+=" is-on";if(el)el.style.display="none";}}catch(e){}},3000);</script>`;
}

/** Seitenende: Anpassen-Button (FAB) + Customizer-Panel + Panel-Logik. */
export function footer() {
  return `<button class="cz-fab" id="cz-open" aria-label="Seite anpassen" title="Seite anpassen">✦</button>
${panelHtml()}
<script src="/assets/kit-panel.js?v=${ASSET_VERSION}"></script>
</body></html>`;
}
