// _lib/panel.ts — markup of the customizer panel (right drawer, "Customize").
// The matching logic lives in public/assets/kit-panel.js and hooks onto the
// data-fn/data-kind attributes: data-fn picks the setter (layout/type/card/base/struct),
// data-kind the control, data-v the value. Structure controls (struct) write a
// cookie and reload; everything else applies live via CSS variables/classes.
//
// i18n: ONLY button/label TEXT goes through t(); the data-v VALUES are schema
// (cookies/localStorage/KV) and stay verbatim — they remain the original German enum values.

import { PUBLICATION } from "./config.ts";
import { makeT } from "./i18n.ts";
import { esc } from "./util.ts";

// The customizer panel always renders in English, even on a `de` site — only the
// public-facing site keeps its language; this admin panel is decoupled from it.
const t = makeT("en");

export function panelHtml(): string {
  return `<aside class="cz" id="cz-panel" aria-label="${esc(t("panel.title"))}">
  <div class="cz-head"><span>${esc(t("panel.title"))}</span><div><button class="cz-reset" id="cz-reset" title="${esc(t("panel.reset.title"))}">${esc(t("panel.reset"))}</button><button class="cz-x" id="cz-close" aria-label="${esc(t("panel.close.aria"))}">›</button></div></div>
  <div class="cz-pubbar">
    <button class="cz-pub" id="cz-pub" type="button" title="${esc(t("panel.publish.title"))}">${esc(t("panel.publish"))}</button>
    <div class="cz-pubmeta"><span id="cz-pub-ts">–</span><button class="cz-pub-undo" id="cz-pub-undo" type="button" title="${esc(t("panel.publish.undo.title"))}">${esc(t("panel.publish.undo"))}</button></div>
  </div>
  <div class="cz-body">
    <section class="cz-sec cz-open"><button class="cz-sh" data-acc>${t("panel.sec.looks")}<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-hint">${esc(t("panel.looks.hint"))}</p>
      <div class="cz-looks" id="cz-looks"></div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>${t("panel.sec.header")}<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">${esc(t("panel.brand.label"))}</label><input class="cz-inp" id="cz-brand" type="text" placeholder="${esc(PUBLICATION)}" maxlength="60"/>
      <label class="cz-lbl">${esc(t("panel.logo.label"))}</label><div class="cz-logo"><label class="cz-logo-up">${esc(t("panel.logo.choose"))}<input type="file" id="cz-logo-file" accept="image/*" hidden/></label><button class="cz-logo-rm" id="cz-logo-rm" type="button">${esc(t("panel.logo.remove"))}</button></div>
      <p class="cz-hint">${esc(t("panel.logo.hint"))}</p>
      <label class="cz-lbl">${esc(t("panel.headerstyle"))}</label><div class="cz-seg" data-fn="struct" data-kind="header"><button data-v="links">${esc(t("panel.v.links"))}</button><button data-v="zentriert">${esc(t("panel.v.zentriert"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.navstyle"))}</label><div class="cz-seg" data-fn="layout" data-kind="nav"><button data-v="standard">${esc(t("panel.v.standard"))}</button><button data-v="figma">${esc(t("panel.v.figma"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.search"))}</label><div class="cz-seg" data-fn="struct" data-kind="search"><button data-v="0">${esc(t("panel.v.aus"))}</button><button data-v="1">${esc(t("panel.v.an"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.nav.label"))}</label><div class="cz-nav" id="cz-nav"></div>
      <button class="cz-nav-add" id="cz-nav-add" type="button">${esc(t("panel.nav.add"))}</button>
      <button class="cz-apply" id="cz-chrome-apply" type="button">${esc(t("panel.apply"))}</button>
      <p class="cz-subhead">${esc(t("panel.sec.footer"))}</p>
      <label class="cz-lbl">${esc(t("panel.foot.label"))}</label><div class="cz-nav" id="cz-foot"></div>
      <button class="cz-nav-add" id="cz-foot-add" type="button">${esc(t("panel.foot.add"))}</button>
      <button class="cz-apply" id="cz-foot-apply" type="button">${esc(t("panel.apply"))}</button>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>${t("panel.sec.colors")}<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-hint">${esc(t("panel.colors.hint"))}</p>
      <label class="cz-lbl">${esc(t("panel.mode"))}</label><div class="cz-seg" data-fn="base" data-kind="mode"><button data-v="light">${esc(t("panel.v.hell"))}</button><button data-v="dark">${esc(t("panel.v.dunkel"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.scheme"))} <span class="cz-lbl-x">${esc(t("panel.scheme.x"))}</span></label><div class="cz-pal" id="cz-pal"></div>
      <label class="cz-lbl">${esc(t("panel.customcolors"))}</label>
      <div class="cz-colors">
        <label class="cz-color"><input type="color" id="cz-c-brand" value="#137EC0"><span class="cz-color-t">${t("panel.color.brand")}<em>${t("panel.color.brand.sub")}</em></span></label>
        <label class="cz-color"><input type="color" id="cz-c-accent" value="#FF7264"><span class="cz-color-t">${t("panel.color.accent")}<em>${t("panel.color.accent.sub")}</em></span></label>
        <label class="cz-color"><input type="color" id="cz-c-bg" value="#FFFFFF"><span class="cz-color-t">${t("panel.color.bg")}<em>${t("panel.color.bg.sub")}</em></span></label>
      </div>
      <p class="cz-warn" id="cz-warn">${esc(t("panel.contrast.warn"))}</p>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>${t("panel.sec.fonts")}<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-hint">${esc(t("panel.fonts.hint"))}</p>
      <label class="cz-lbl">${esc(t("panel.fonts.head"))}</label><div class="cz-font"><input class="cz-font-in" id="cz-fh-in" type="text" placeholder="${esc(t("panel.fonts.search"))}" autocomplete="off" spellcheck="false"><div class="cz-font-pop" id="cz-fh-pop"></div></div>
      <label class="cz-lbl">${esc(t("panel.fonts.body"))}</label><div class="cz-font"><input class="cz-font-in" id="cz-fb-in" type="text" placeholder="${esc(t("panel.fonts.search"))}" autocomplete="off" spellcheck="false"><div class="cz-font-pop" id="cz-fb-pop"></div></div>
      <button class="cz-more" id="cz-pairs-more" type="button" aria-expanded="false">${esc(t("panel.fonts.suggest"))}<span class="cz-cv">▾</span></button>
      <div class="cz-more-body" id="cz-pairs-adv">
        <div class="cz-pairs" id="cz-pairs"></div>
      </div>
      <label class="cz-lbl">${esc(t("panel.fonts.size"))}</label><div class="cz-seg" data-fn="type" data-kind="size"><button data-v="klein">${esc(t("panel.v.klein"))}</button><button data-v="standard">${esc(t("panel.v.standard"))}</button><button data-v="gross">${esc(t("panel.v.gross"))}</button></div>
      <button class="cz-more" id="cz-type-more" type="button" aria-expanded="false">${esc(t("panel.fonts.fine"))}<span class="cz-cv">▾</span></button>
      <div class="cz-more-body" id="cz-type-adv">
        <label class="cz-lbl">${esc(t("panel.fonts.lead"))}</label><div class="cz-seg" data-fn="type" data-kind="lead"><button data-v="eng">${esc(t("panel.v.eng"))}</button><button data-v="normal">${esc(t("panel.v.normal"))}</button><button data-v="luftig">${esc(t("panel.v.luftig"))}</button></div>
        <label class="cz-lbl">${esc(t("panel.fonts.track"))}</label><div class="cz-seg" data-fn="type" data-kind="track"><button data-v="eng">${esc(t("panel.v.eng"))}</button><button data-v="normal">${esc(t("panel.v.normal"))}</button><button data-v="weit">${esc(t("panel.v.weit"))}</button></div>
        <label class="cz-lbl">${esc(t("panel.fonts.case"))}</label><div class="cz-seg" data-fn="type" data-kind="case"><button data-v="normal">Aa</button><button data-v="gross">AA</button><button data-v="title">Aa Bb</button></div>
      </div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>${t("panel.sec.layout")}<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-subhead">${esc(t("panel.layout.structure"))}</p>
      <label class="cz-lbl">${esc(t("panel.layout.shell"))}</label><div class="cz-seg" data-fn="struct" data-kind="shell"><button data-v="single">${esc(t("panel.v.einspaltig"))}</button><button data-v="portal">${esc(t("panel.v.portal"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.layout.auf"))}</label><div class="cz-seg" data-fn="struct" data-kind="auf"><button data-v="klein">${esc(t("panel.v.klein"))}</button><button data-v="gross">${esc(t("panel.v.gross"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.layout.stream"))}</label><div class="cz-seg" data-fn="struct" data-kind="stream"><button data-v="liste">${esc(t("panel.v.liste"))}</button><button data-v="rubrik">${esc(t("panel.v.rubrik"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.layout.rails"))}</label><div class="cz-rails" id="cz-rails"><button data-rail="neueste">${esc(t("panel.v.neueste"))}</button><button data-rail="meist">${esc(t("panel.v.meist"))}</button><button data-rail="themen">${esc(t("panel.v.themen"))}</button></div>
      <p class="cz-hint">${esc(t("panel.layout.reloadhint"))}</p>
      <p class="cz-subhead">${esc(t("panel.layout.grid"))}</p>
      <label class="cz-lbl">${esc(t("panel.layout.cols"))}</label><div class="cz-seg" data-fn="layout" data-kind="cols"><button data-v="2">2</button><button data-v="3">3</button><button data-v="4">4</button></div>
      <label class="cz-lbl">${esc(t("panel.layout.width"))}</label><div class="cz-seg" data-fn="layout" data-kind="width"><button data-v="schmal">${esc(t("panel.v.schmal"))}</button><button data-v="standard">${esc(t("panel.v.standard"))}</button><button data-v="breit">${esc(t("panel.v.breit"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.layout.dens"))}</label><div class="cz-seg" data-fn="layout" data-kind="dens"><button data-v="kompakt">${esc(t("panel.v.kompakt"))}</button><button data-v="komfortabel">${esc(t("panel.v.komfort"))}</button><button data-v="grosszuegig">${esc(t("panel.v.weit"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.layout.corner"))}</label><div class="cz-seg" data-fn="layout" data-kind="corner"><button data-v="eckig">${esc(t("panel.v.eckig"))}</button><button data-v="rund">${esc(t("panel.v.rund"))}</button></div>
      <p class="cz-subhead">${esc(t("panel.layout.hero"))}</p>
      <label class="cz-lbl">${esc(t("panel.layout.herostyle"))}</label><div class="cz-seg" data-fn="layout" data-kind="hero"><button data-v="split">${esc(t("panel.v.geteilt"))}</button><button data-v="center">${esc(t("panel.v.zentriert"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.layout.align"))}</label><div class="cz-seg" data-fn="type" data-kind="align"><button data-v="links">${esc(t("panel.v.links"))}</button><button data-v="zentriert">${esc(t("panel.v.zentriert"))}</button></div>
      <p class="cz-subhead">${esc(t("panel.sec.cards"))}</p>
      <label class="cz-lbl">${esc(t("panel.cards.style"))}</label><div class="cz-seg cz-seg--wrap" data-fn="card" data-kind="style"><button data-v="classic">${esc(t("panel.v.klassisch"))}</button><button data-v="side">${esc(t("panel.v.bildlinks"))}</button><button data-v="text">${esc(t("panel.v.nurtext"))}</button><button data-v="overlay">${esc(t("panel.v.overlay"))}</button><button data-v="list">${esc(t("panel.v.cardliste"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.cards.aspect"))}</label><div class="cz-seg" data-fn="card" data-kind="aspect"><button data-v="16:9">16:9</button><button data-v="4:3">4:3</button><button data-v="1:1">1:1</button></div>
      <label class="cz-lbl">${esc(t("panel.cards.surface"))}</label><div class="cz-seg" data-fn="card" data-kind="surface"><button data-v="flat">${esc(t("panel.v.flach"))}</button><button data-v="soft">${esc(t("panel.v.schatten"))}</button><button data-v="outline">${esc(t("panel.v.umrandet"))}</button></div>
      <label class="cz-lbl">${esc(t("panel.cards.image"))}</label><div class="cz-seg" data-fn="card" data-kind="image"><button data-v="farbe">${esc(t("panel.v.farbe"))}</button><button data-v="duotone">${esc(t("panel.v.duotone"))}</button><button data-v="graustufen">${esc(t("panel.v.grau"))}</button></div>
    </div></section>
  </div>
</aside>`;
}
