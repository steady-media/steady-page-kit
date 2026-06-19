// @ts-check
/* kit-panel.js — customizer panel logic (runs at the end of <body>, panel DOM exists).
 *
 * Division of labor: kit-theme.js provides the catalogs + setters (_w.kit*);
 * this file wires the panel controls to them. Generic controls are bound via
 * data attributes: data-fn (setter family) + data-kind (control) + data-v (value).
 *
 * Persistence: personal settings in localStorage/cookies; "Publish for all
 * visitors" publishes them globally via PUT /api/config (admin code, KV).
 */

// Shorthand reference to window with the kit extensions (typedef in kit-theme.js).
// On the browser page both files are loaded; tsc checks them together (tsconfig.browser.json).
/** @type {Window & typeof globalThis & KitWindowExtensions} */
var _w = /** @type {any} */ (window);
(function () {
  var D = document.documentElement;

  /* — i18n: page.ts injects _w.KIT_I18N (language from kit.config.js).
       The English literals remain as a built-in fallback. — */
  /** @type {Record<string,unknown>} */
  var I18N = /** @type {Record<string,unknown>} */ (_w.KIT_I18N || {});
  /** @param {string} key @param {string} fallback */
  function T(key, fallback) { return I18N[key] != null ? /** @type {string} */ (I18N[key]) : fallback; }

  /* — Storage helpers: localStorage first, then the globally published base — */
  /** @param {string} k @param {unknown} [d] */
  function gs(k, d) {
    try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {}
    if (_w.KIT_GLOBAL && _w.KIT_GLOBAL[k] != null) return _w.KIT_GLOBAL[k];
    return d;
  }
  /** @param {string} k @returns {Record<string,unknown>} */
  function jget(k) {
    /** @type {string|null} */
    var v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (v == null && _w.KIT_GLOBAL && _w.KIT_GLOBAL[k] != null) v = /** @type {string} */ (_w.KIT_GLOBAL[k]);
    if (v != null) { try { return JSON.parse(v); } catch (e) {} }
    return {};
  }

  /* ---------------------------------------------------------------- Open/close + accordion */
  /** @param {boolean} open */
  function setOpen(open) {
    D.classList.toggle("cz-on", open);
    try { localStorage.setItem("kitPanelOpen", open ? "1" : "0"); } catch (e) {}
  }
  var openBtn = document.getElementById("cz-open"), closeBtn = document.getElementById("cz-close");
  if (openBtn) openBtn.addEventListener("click", function () { setOpen(true); if (closeBtn) closeBtn.focus(); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); if (openBtn) openBtn.focus(); });
  // ESC closes the panel (search/dialogs handle ESC themselves)
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && D.classList.contains("cz-on")) { setOpen(false); if (openBtn) openBtn.focus(); }
  });

  // Remember which sections are open, keyed by their TITLE (stable across panel
  // structure changes — an index list breaks the moment a section is added/removed,
  // which is what made a closed section pop back open). Restore on load.
  /** @param {Element} s */
  function secKey(s) { var h = s.querySelector(".cz-sh"); return h ? (h.textContent || "").replace("▾", "").trim() : ""; }
  function saveAccordion() {
    /** @type {string[]} */
    var open = [];
    document.querySelectorAll(".cz-sec").forEach(function (s) { if (s.classList.contains("cz-open")) open.push(secKey(s)); });
    try { localStorage.setItem("kitAcc3", JSON.stringify(open)); } catch (e) {}
  }
  (function restoreAccordion() {
    /** @type {string[]|null} */
    var a = null;
    try { a = JSON.parse(localStorage.getItem("kitAcc3") || "null"); } catch (e) {}
    if (a && typeof a.length === "number") {
      var saved = a;
      document.querySelectorAll(".cz-sec").forEach(function (s) { s.classList.toggle("cz-open", saved.indexOf(secKey(s)) >= 0); });
    }
  })();
  document.querySelectorAll(".cz-sh[data-acc]").forEach(function (h) {
    h.addEventListener("click", function () { if (h.parentElement) h.parentElement.classList.toggle("cz-open"); saveAccordion(); });
  });

  // Any manual change clears the look marker (no look is "active" anymore)
  function clearLook() {
    try { localStorage.removeItem("kitLook"); } catch (e) {}
    markLook();
  }

  /* ---------------------------------------------------------------- Fonts */
  // Free combination: two dropdowns (heading + body), each showing only the fonts
  // that suit that role and previewing every option in its own typeface + weight.
  // Curated combinations live in the collapsed "Suggestions" gallery.
  _w.KIT_BUNNY = _w.KIT_BUNNY || {};
  _w.KIT_BUNNY_LIST = _w.KIT_BUNNY_LIST || [];

  /** @param {string} s */
  function titleCase(s) {
    var p = String(s || "").split("-");
    for (var i = 0; i < p.length; i++) p[i] = p[i].charAt(0).toUpperCase() + p[i].slice(1);
    return p.join(" ");
  }
  // Search pool: favorites first, then the rest of the catalog (max 60 hits)
  function fontPool() {
    /** @type {Record<string,number>} */
    var seen = {};
    /** @type {KitFont[]} */
    var out = [];
    for (var i = 0; i < _w.KIT_FONTS.length; i++) { out.push(_w.KIT_FONTS[i]); seen[_w.KIT_FONTS[i].s] = 1; }
    for (var j = 0; j < _w.KIT_BUNNY_LIST.length; j++) if (!seen[_w.KIT_BUNNY_LIST[j].s]) out.push(_w.KIT_BUNNY_LIST[j]);
    return out;
  }
  // Role of a font (which dropdown it may appear in), from Fontshare's category +
  // a small research-based override list. Display/Script faces are heading-only;
  // quiet reading faces are body-first; versatile text faces do both.
  /** @type {Record<string,number>} */
  var HEADLINE_ONLY = { technor: 1, excon: 1, quilon: 1, "rx-100": 1, gambarino: 1, zodiak: 1, bonny: 1, hoover: 1, paquito: 1 };
  /** @type {Record<string,number>} */
  var BODY_ONLY = { synonym: 1, author: 1, recia: 1 };
  /** @param {KitFont} f @returns {string} "head" | "body" | "both" */
  function fontRole(f) {
    if (BODY_ONLY[f.s]) return "body";
    if (HEADLINE_ONLY[f.s] || f.c === "Display" || f.c === "Script") return "head";
    return "both"; // Sans, Serif, Slab, Mono workhorses
  }
  /** @param {KitFont} f @param {string} role */
  function roleOk(f, role) {
    var r = fontRole(f);
    return role === "head" ? r !== "body" : r !== "head";
  }
  /** @param {string} q @param {string} role */
  function fontMatch(q, role) {
    q = (q || "").toLowerCase();
    var pool = fontPool(), res = /** @type {KitFont[]} */ ([]);
    for (var i = 0; i < pool.length && res.length < 60; i++) {
      var f = pool[i];
      if (!roleOk(f, role)) continue;
      if (!q || f.n.toLowerCase().indexOf(q) >= 0 || f.s.indexOf(q) >= 0) res.push(f);
    }
    return res;
  }
  // Display name of the currently stored font (JSON descriptor or legacy slug)
  /** @param {string} role */
  function curName(role) {
    var v = /** @type {string} */ (gs(role === "head" ? "kitFontHead" : "kitFontBody", role === "head" ? _w.KIT_DEFAULT_HEAD : _w.KIT_DEFAULT_BODY));
    if (v && v.charAt(0) === "{") { try { var o = JSON.parse(v); if (o && o.n) return o.n; } catch (e) {} }
    for (var i = 0; i < _w.KIT_FONTS.length; i++) if (_w.KIT_FONTS[i].s === v) return _w.KIT_FONTS[i].n;
    if (_w.KIT_BUNNY && _w.KIT_BUNNY[v]) return _w.KIT_BUNNY[v].n;
    return titleCase(v);
  }

  var pairsEl = document.getElementById("cz-pairs");
  function clearPairSel() { if (pairsEl) pairsEl.querySelectorAll(".cz-pair").forEach(function (c) { c.classList.remove("on"); }); }

  /**
   * @param {string} role
   * @param {string} inputId
   * @param {string} popupId
   */
  function setupFontBox(role, inputId, popupId) {
    var inp = /** @type {HTMLInputElement|null} */ (document.getElementById(inputId));
    var pop = /** @type {HTMLElement|null} */ (document.getElementById(popupId));
    if (!inp || !pop) return;
    var _inp = inp, _pop = pop; // non-null aliases for closures
    _inp.value = curName(role);
    /** @type {IntersectionObserver|null} */
    var io = null;
    // Preview weight matches how the font will actually render in this role
    // (headings use --weight-heading ≈ 700, body uses --weight-body ≈ 400).
    var previewWeight = role === "head" ? "700" : "400";
    /** @param {string} q */
    function render(q) {
      var res = fontMatch(q, role);
      _pop.innerHTML = "";
      if (io) io.disconnect();
      var map = (typeof Map === "function") ? new Map() : null;
      for (var i = 0; i < res.length; i++) {
        (function (f) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "cz-font-opt";
          // Each option previews itself in its own typeface.
          var nm = document.createElement("span"); nm.textContent = f.n;
          nm.style.fontFamily = '"' + f.n + '", ' + (f.g || "sans-serif");
          nm.style.fontWeight = previewWeight;
          var cats = /** @type {Record<string,string>|undefined} */ (/** @type {any} */ (I18N).cats);
          var ct = document.createElement("em"); ct.textContent = (cats && cats[f.c]) || f.c || f.g || "";
          b.appendChild(nm); b.appendChild(ct);
          // mousedown instead of click: fires before the input's blur (popup stays usable)
          b.addEventListener("mousedown", function (e) {
            e.preventDefault();
            _w.kitApplyFont(role, f, true);
            _inp.value = f.n;
            _pop.classList.remove("open");
            clearPairSel();
            clearLook();
          });
          _pop.appendChild(b);
          if (map) map.set(b, f);
        })(res[i]);
      }
      _pop.classList.toggle("open", res.length > 0);
      // Lazy-load the preview webfont only as an option scrolls into the popup.
      if (map && typeof IntersectionObserver === "function" && _w.kitFontCss) {
        var _map = map; // non-null alias for the closure
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var f = _map.get(en.target);
            if (f && _w.kitFontCss) { _w.kitFontCss(f); if (io) io.unobserve(en.target); }
          });
        }, { root: _pop });
        _pop.querySelectorAll(".cz-font-opt").forEach(function (b) { if (io) io.observe(b); });
      } else if (_w.kitFontCss) {
        for (var k = 0; k < res.length; k++) _w.kitFontCss(res[k]);
      }
    }
    _inp.addEventListener("focus", function () {
      _inp.select();
      render("");
    });
    _inp.addEventListener("input", function () { render(_inp.value); });
    _inp.addEventListener("blur", function () { setTimeout(function () { _pop.classList.remove("open"); }, 170); });
  }
  setupFontBox("head", "cz-fh-in", "cz-fh-pop");
  setupFontBox("body", "cz-fb-in", "cz-fb-pop");

  // Font pairs — gallery of curated combinations (one tap = heading + body)
  /** @param {string} slug @returns {KitFont} */
  function fontBySlug(slug) {
    for (var i = 0; i < _w.KIT_FONTS.length; i++) if (_w.KIT_FONTS[i].s === slug) return _w.KIT_FONTS[i];
    return { s: slug, n: titleCase(slug), g: "sans-serif", w: "400,500,700", c: "" };
  }
  if (pairsEl && _w.KIT_PAIRS) {
    var _pairsEl = pairsEl; // non-null alias
    var pairNames = /** @type {string[]|undefined} */ (/** @type {any} */ (I18N).pairs);
    /** @type {Array<{h:KitFont,b:KitFont}>} */
    var pairFonts = [];
    for (var pi = 0; pi < _w.KIT_PAIRS.length; pi++) {
      (function (idx) {
        var pr = _w.KIT_PAIRS[idx];
        var hf = fontBySlug(pr.h), bf = fontBySlug(pr.b);
        pairFonts.push({ h: hf, b: bf });
        var card = document.createElement("button");
        card.type = "button"; card.className = "cz-pair";
        card.setAttribute("data-pi", String(idx));
        card.title = (pairNames && pairNames[idx]) || pr.n;
        var hs = document.createElement("span"); hs.className = "cz-pair-h";
        hs.textContent = hf.n; hs.style.fontFamily = '"' + hf.n + '", ' + (hf.g || "sans-serif"); hs.style.fontWeight = "700";
        var bs = document.createElement("span"); bs.className = "cz-pair-b";
        bs.textContent = bf.n; bs.style.fontFamily = '"' + bf.n + '", ' + (bf.g || "sans-serif"); bs.style.fontWeight = "400";
        card.appendChild(hs); card.appendChild(bs);
        card.addEventListener("click", function () {
          _w.kitApplyFont("head", hf, true);
          _w.kitApplyFont("body", bf, true);
          var fh = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fh-in")); if (fh) fh.value = curName("head");
          var fb = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fb-in")); if (fb) fb.value = curName("body");
          clearPairSel(); card.classList.add("on");
          clearLook();
        });
        _pairsEl.appendChild(card);
      })(pi);
    }
    // Preview fonts load only when the gallery is actually visible (panel open + section expanded).
    /** @param {Element} el */
    function previewPair(el) {
      var i = parseInt(el.getAttribute("data-pi") || "-1", 10);
      if (i < 0 || !_w.kitFontCss) return;
      _w.kitFontCss(pairFonts[i].h); _w.kitFontCss(pairFonts[i].b);
    }
    var cards = _pairsEl.querySelectorAll(".cz-pair");
    if (typeof IntersectionObserver === "function") {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { previewPair(en.target); io.unobserve(en.target); } });
      });
      cards.forEach(function (c) { io.observe(c); });
    } else {
      cards.forEach(previewPair);
    }
  }

  // Collapsible disclosures: "Suggestions" + "Fine-tuning"
  [["cz-pairs-more", "cz-pairs-adv"], ["cz-type-more", "cz-type-adv"]].forEach(function (pair) {
    var btn = document.getElementById(pair[0]), body = document.getElementById(pair[1]);
    if (!btn || !body) return;
    var _btn = btn, _body = body;
    _btn.addEventListener("click", function () {
      var open = _body.classList.toggle("open");
      _btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------------------------------------------------------------- Colors + contrast guard */
  /** @type {Record<string,string>} */
  var colorMap = { "cz-c-brand": "--color-brand", "cz-c-accent": "--color-accent", "cz-c-bg": "--color-bg" };
  /** @param {string} name @returns {string} */
  function cssVar(name) { return getComputedStyle(D).getPropertyValue(name).trim(); }
  function checkWarn() {
    var w = document.getElementById("cz-warn");
    if (!w || !_w.KIT_RATIO) return;
    var r = _w.KIT_RATIO(cssVar("--color-brand") || "#000000", cssVar("--color-bg") || "#ffffff");
    w.classList.toggle("show", r < 2.6);
  }
  function syncColors() {
    for (var id in colorMap) {
      var el = /** @type {HTMLInputElement|null} */ (document.getElementById(id));
      if (el) { var h = cssVar(/** @type {string} */ (colorMap[/** @type {string} */ (id)])); if (h.charAt(0) === "#" && h.length === 7) el.value = h; }
    }
    checkWarn();
  }
  var pal = document.getElementById("cz-pal");
  function markPal() {
    var sv = gs("kitPalette", null);
    if (pal) Array.from(pal.children).forEach(function (x, i) { x.classList.toggle("on", String(i) === sv); });
  }
  // Scheme swatches: two-tone (accent + actual background), dark schemes marked
  if (pal && _w.KIT_PALETTES) {
    for (var qi = 0; qi < _w.KIT_PALETTES.length; qi++) {
      (function (idx) {
        var p = _w.KIT_PALETTES[idx];
        var b = document.createElement("button");
        var i18nPalettes = /** @type {Record<number,string>|undefined} */ (/** @type {any} */ (I18N).palettes);
        b.title = ((i18nPalettes && i18nPalettes[idx]) || p.n)
          + ((_w.KIT_RL && _w.KIT_RL(p.v["--color-bg"] || "#FFFFFF") < 0.42) ? T("palette.dark", " (dark)") : "");
        var brand = p.v["--color-brand"], bg = p.v["--color-bg"] || "#FFFFFF";
        b.style.background = "linear-gradient(135deg, " + brand + " 0 50%, " + bg + " 50% 100%)";
        b.addEventListener("click", function () { _w.kitPalette(idx, true); markPal(); syncColors(); clearLook(); });
        pal.appendChild(b);
      })(qi);
    }
  }
  for (var cid in colorMap) {
    (function (elId, varName) {
      var el = /** @type {HTMLInputElement|null} */ (document.getElementById(elId));
      if (el) { var _el = el; _el.addEventListener("input", function () { _w.kitColor(varName, _el.value, true); checkWarn(); clearLook(); }); }
    })(cid, /** @type {string} */ (colorMap[/** @type {string} */ (cid)]));
  }

  /* ---------------------------------------------------------------- Generic segments */
  // data-fn picks the setter family, data-kind the control, data-v the value.
  /** @type {Record<string, Record<string,string>>} */
  var DEFAULTS = {
    layout: { cols: "3", width: "standard", dens: "komfortabel", corner: "eckig", hero: "split", nav: "standard" },
    type:   { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    card:   { style: "classic", aspect: "16:9", surface: "flat", image: "farbe" },
    struct: { shell: "single", auf: "klein", stream: "liste", header: "links", search: "0" },
  };
  /** @type {Record<string,string>} */
  var STORE_KEYS = { layout: "kitLayout", type: "kitType", card: "kitCard", struct: "kitStruct" };
  /** @param {string} fn @param {string} kind */
  function currentValue(fn, kind) {
    if (fn === "base") return gs("kitBase", "light");
    var o = jget(STORE_KEYS[fn]);
    return (o[kind] != null) ? o[kind] : (DEFAULTS[fn] && DEFAULTS[fn][kind]);
  }
  /** @param {string} fn @param {string} kind @param {string|null} val */
  function applyValue(fn, kind, val) {
    if (fn === "layout") _w.kitSetLayout(kind, val || "", true);
    else if (fn === "type") _w.kitType(kind, val || "", true);
    else if (fn === "card") _w.kitCard(kind, val || "", true);
    else if (fn === "base") _w.kitBase(val || "", true);
    else if (fn === "struct") { var o = /** @type {Record<string,unknown>} */ ({}); o[kind] = val; _w.kitStructSet(o, true); } // → Reload
  }
  /** @param {Element} seg */
  function markSeg(seg) {
    var fn = seg.getAttribute("data-fn") || "", kind = seg.getAttribute("data-kind") || "mode";
    var cur = currentValue(fn, kind);
    seg.querySelectorAll("[data-v]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === String(cur)); });
  }
  document.querySelectorAll(".cz-seg").forEach(function (seg) {
    var fn = seg.getAttribute("data-fn") || "", kind = seg.getAttribute("data-kind") || "mode";
    markSeg(seg);
    seg.querySelectorAll("[data-v]").forEach(function (b) {
      b.addEventListener("click", function () {
        applyValue(fn, kind, b.getAttribute("data-v"));
        markSeg(seg);
        if (fn === "base") syncColors();
        clearLook();
      });
    });
  });

  /* ---------------------------------------------------------------- Side rails (portal only) */
  var railsEl = document.getElementById("cz-rails");
  if (railsEl) {
    var _railsEl = railsEl; // non-null alias
    var st0 = jget("kitStruct"), shell0 = /** @type {string} */ (st0["shell"] || "single");
    var rails0 = /** @type {string[]} */ (Array.isArray(st0["rails"]) ? st0["rails"] : (shell0 === "portal" ? ["neueste", "meist", "themen"] : []));
    _railsEl.classList.toggle("cz-rails--off", shell0 !== "portal");
    _railsEl.querySelectorAll("[data-rail]").forEach(function (b) {
      var rail = b.getAttribute("data-rail") || "";
      if (rails0.indexOf(rail) >= 0) b.classList.add("on");
      b.addEventListener("click", function () {
        var s = jget("kitStruct");
        var cur = /** @type {string[]} */ (Array.isArray(s["rails"]) ? s["rails"].slice() : (((s["shell"] || "single") === "portal") ? ["neueste", "meist", "themen"] : []));
        var i = cur.indexOf(rail);
        if (i >= 0) cur.splice(i, 1); else cur.push(rail);
        _w.kitStructSet({ rails: cur }, true); // → Reload
      });
    });
  }

  /* ---------------------------------------------------------------- Header: title + navigation */
  var navEd = document.getElementById("cz-nav");
  var footEd = document.getElementById("cz-foot");
  var brandInp = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-brand"));

  /** @type {{ brand?: string, nav?: Array<{l:string,h:string,x:boolean}>, foot?: Array<{l:string,h:string,x:boolean}> }} */
  var savedChrome = {};
  try { savedChrome = JSON.parse(localStorage.getItem("kitChrome") || "{}"); } catch (e) {}
  if (brandInp) brandInp.value = savedChrome.brand || _w.KIT_DEFAULT_BRAND || "";

  /** Reads all nav rows from an editor container and returns the array. */
  /** @param {Element} ed */
  function collectRows(ed) {
    /** @type {Array<{l:string,h:string,x:boolean}>} */
    var out = [];
    ed.querySelectorAll(".cz-nav-row").forEach(function (r) {
      var lEl = /** @type {HTMLInputElement|null} */ (r.querySelector(".cz-nav-l"));
      var hEl = /** @type {HTMLInputElement|null} */ (r.querySelector(".cz-nav-h"));
      var l = lEl ? lEl.value.trim() : "", h = hEl ? hEl.value.trim() : "";
      if (l) out.push({ l: l, h: h || "#", x: (h.indexOf("http") === 0 && h.indexOf(location.host) < 0) });
    });
    return out;
  }

  /** Collects brand + nav + foot from the panel and writes kitchrome → reload. */
  function writeChrome() {
    var brand = brandInp ? brandInp.value.trim() : "";
    var nav = navEd ? collectRows(navEd) : (savedChrome.nav || []);
    var foot = footEd ? collectRows(footEd) : (savedChrome.foot || []);
    _w.kitChromeSet({ brand: brand, nav: nav, foot: foot }); // → Reload
  }

  if (navEd) {
    var _navEd = navEd; // non-null alias

    // Initial list: stored > current page nav (DOM) > default
    /** @type {Array<{l:string,h:string,x?:boolean}>|undefined} */
    var navInit = savedChrome.nav;
    if (!navInit) {
      var dom = document.querySelectorAll(".tabs__inner .tab");
      if (dom.length) navInit = Array.from(dom).map(function (a) {
        var anchor = /** @type {HTMLAnchorElement} */ (a);
        return { l: (anchor.textContent || "").trim(), h: anchor.getAttribute("href") || "", x: anchor.target === "_blank" };
      });
    }
    if (!navInit) navInit = _w.KIT_DEFAULT_NAV || [];

    /** @param {Element} row @param {number} dir */
    function moveRow(row, dir) {
      var sib = dir < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!sib) return;
      if (dir < 0) _navEd.insertBefore(row, sib); else _navEd.insertBefore(sib, row);
    }
    // One editable nav row: grip (drag + arrow keys) | label | URL | remove
    /** @param {Element} container @param {{ l?: string, h?: string, x?: boolean }|undefined} [n] */
    function navRow(container, n) {
      var row = document.createElement("div"); row.className = "cz-nav-row";
      var grip = document.createElement("button");
      grip.type = "button"; grip.className = "cz-nav-grip"; grip.textContent = "⠿";
      grip.title = T("nav.grip.title", "Drag or use arrow keys to reorder"); grip.setAttribute("aria-label", T("nav.grip.aria", "Move link"));
      var label = document.createElement("input"); label.className = "cz-nav-l"; label.placeholder = T("nav.label.ph", "Label"); label.value = (n && n.l) || "";
      var href = document.createElement("input"); href.className = "cz-nav-h"; href.placeholder = T("nav.url.ph", "URL"); href.value = (n && n.h) || "";
      var del = document.createElement("button"); del.type = "button"; del.className = "cz-nav-x"; del.textContent = "×"; del.title = T("nav.remove", "Remove");
      del.addEventListener("click", function () { if (row.parentNode) row.parentNode.removeChild(row); });
      grip.addEventListener("keydown", function (e) {
        var ke = /** @type {KeyboardEvent} */ (e);
        if (ke.key === "ArrowUp") { ke.preventDefault(); moveRow(row, -1); grip.focus(); }
        else if (ke.key === "ArrowDown") { ke.preventDefault(); moveRow(row, 1); grip.focus(); }
      });
      grip.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        row.classList.add("cz-nav-row--drag");
        /** @param {PointerEvent} ev */
        var move = function (ev) {
          var rows = /** @type {Element[]} */ (Array.from(_navEd.querySelectorAll(".cz-nav-row")));
          /** @type {Element|null} */
          var after = null;
          for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (r === row) continue;
            var b = r.getBoundingClientRect();
            if (ev.clientY < b.top + b.height / 2) { after = r; break; }
          }
          if (after) _navEd.insertBefore(row, after); else _navEd.appendChild(row);
        };
        var up = function () {
          row.classList.remove("cz-nav-row--drag");
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
      });
      row.appendChild(grip); row.appendChild(label); row.appendChild(href); row.appendChild(del);
      container.appendChild(row);
    }
    (navInit || []).forEach(function (n) { navRow(_navEd, n); });

    var addBtn = document.getElementById("cz-nav-add");
    if (addBtn) addBtn.addEventListener("click", function () { navRow(_navEd, { l: "", h: "" }); });

    var applyBtn = document.getElementById("cz-chrome-apply");
    if (applyBtn) applyBtn.addEventListener("click", writeChrome);
  }

  /* ---------------------------------------------------------------- Footer: Links */
  if (footEd) {
    var _footEd = footEd; // non-null alias

    // Initial footer links from kitchrome
    /** @type {Array<{l:string,h:string,x?:boolean}>} */
    var footInit = savedChrome.foot || [];

    // Footer row: label | URL | remove (no drag grip — order less critical)
    /** @param {{ l?: string, h?: string, x?: boolean }|undefined} [n] */
    function footRow(n) {
      var row = document.createElement("div"); row.className = "cz-nav-row";
      var label = document.createElement("input"); label.className = "cz-nav-l"; label.placeholder = T("nav.label.ph", "Label"); label.value = (n && n.l) || "";
      var href = document.createElement("input"); href.className = "cz-nav-h"; href.placeholder = T("nav.url.ph", "URL"); href.value = (n && n.h) || "";
      var del = document.createElement("button"); del.type = "button"; del.className = "cz-nav-x"; del.textContent = "×"; del.title = T("nav.remove", "Remove");
      del.addEventListener("click", function () { if (row.parentNode) row.parentNode.removeChild(row); });
      row.appendChild(label); row.appendChild(href); row.appendChild(del);
      _footEd.appendChild(row);
    }
    footInit.forEach(footRow);

    var footAddBtn = document.getElementById("cz-foot-add");
    if (footAddBtn) footAddBtn.addEventListener("click", function () { footRow({ l: "", h: "" }); });

    var footApplyBtn = document.getElementById("cz-foot-apply");
    if (footApplyBtn) footApplyBtn.addEventListener("click", writeChrome);
  }

  /* ---------------------------------------------------------------- Search (feed-based, /api/search) */
  var searchBtn = document.querySelector(".tabs__search");
  var searchDlg = /** @type {HTMLDialogElement|null} */ (document.getElementById("kit-search"));
  if (searchBtn && searchDlg) {
    var _searchBtn = searchBtn, _searchDlg = searchDlg;
    var sIn = /** @type {HTMLInputElement} */ (document.getElementById("kit-search-in"));
    var sRes = /** @type {HTMLElement} */ (document.getElementById("kit-search-res"));
    /** @type {ReturnType<typeof setTimeout>|null} */
    var sTimer = null, sActive = -1;

    function openSearch() {
      if (typeof _searchDlg.showModal === "function") _searchDlg.showModal();
      else _searchDlg.setAttribute("open", "");
      sIn.value = ""; sRes.innerHTML = ""; sActive = -1;
      sIn.focus();
    }
    function closeSearch() {
      if (typeof _searchDlg.close === "function") _searchDlg.close();
      else _searchDlg.removeAttribute("open");
    }
    /** @param {NodeListOf<Element>} links */
    function markActive(links) {
      for (var i = 0; i < links.length; i++) links[i].classList.toggle("is-active", i === sActive);
      if (links[sActive]) links[sActive].scrollIntoView({ block: "nearest" });
    }
    /**
     * @param {Array<{u:string,t:string,d?:string,c?:string,dt?:string}>} results
     * @param {string} query
     */
    function renderResults(results, query) {
      sRes.innerHTML = ""; sActive = -1;
      if (!results.length) {
        if (query) { var p = document.createElement("p"); p.className = "kit-search__empty"; p.textContent = T("search.empty", 'No results for "{q}".').split("{q}").join(query); sRes.appendChild(p); }
        return;
      }
      results.forEach(function (r) {
        var a = document.createElement("a");
        a.className = "kit-search__a"; a.href = r.u;
        var t = document.createElement("span"); t.className = "kit-search__t"; t.textContent = r.t;
        a.appendChild(t);
        if (r.d) { var d = document.createElement("span"); d.className = "kit-search__d"; d.textContent = r.d; a.appendChild(d); }
        var m = document.createElement("span"); m.className = "kit-search__m";
        m.textContent = [r.c, r.dt].filter(Boolean).join(" · ");
        if (m.textContent) a.appendChild(m);
        sRes.appendChild(a);
      });
    }
    function runSearch() {
      var q = sIn.value.trim();
      if (q.length < 2) { renderResults([], ""); return; }
      fetch("/api/search?q=" + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (j) { if (sIn.value.trim() === q) renderResults((j && j.results) || [], q); })
        .catch(function () {});
    }
    _searchBtn.addEventListener("click", openSearch);
    _searchBtn.addEventListener("keydown", function (e) { var ke = /** @type {KeyboardEvent} */ (e); if (ke.key === "Enter" || ke.key === " ") { ke.preventDefault(); openSearch(); } });
    var closeEl = document.getElementById("kit-search-close"); if (closeEl) closeEl.addEventListener("click", closeSearch);
    // A click on the backdrop (= the dialog element itself) closes it
    _searchDlg.addEventListener("click", function (e) { if (e.target === _searchDlg) closeSearch(); });
    sIn.addEventListener("input", function () { if (sTimer !== null) clearTimeout(sTimer); sTimer = setTimeout(runSearch, 180); });
    sIn.addEventListener("keydown", function (e) {
      var ke = /** @type {KeyboardEvent} */ (e);
      var links = sRes.querySelectorAll(".kit-search__a");
      if (ke.key === "ArrowDown") { ke.preventDefault(); if (links.length) { sActive = Math.min(sActive + 1, links.length - 1); markActive(links); } }
      else if (ke.key === "ArrowUp") { ke.preventDefault(); if (links.length) { sActive = Math.max(sActive - 1, 0); markActive(links); } }
      else if (ke.key === "Enter") { var pick = /** @type {HTMLAnchorElement|undefined} */ (/** @type {any} */ (links[sActive >= 0 ? sActive : 0])); if (pick) { ke.preventDefault(); location.href = pick.href; } }
    });
  }

  /* ---------------------------------------------------------------- Admin code (global writes) */
  // The code is requested once and remembered in the browser; the server checks every
  // request against the secret KIT_ADMIN_CODE (401 → discard the remembered code).
  function kitAdminCode() {
    var c = null;
    try { c = localStorage.getItem("kitAdmin"); } catch (e) {}
    if (!c) {
      c = window.prompt(T("admin.prompt", "Admin code for global changes:"));
      if (c) { c = c.trim(); try { localStorage.setItem("kitAdmin", c); } catch (e) {} }
    }
    return c;
  }
  function kitAdminFail() {
    try { localStorage.removeItem("kitAdmin"); } catch (e) {}
    alert(T("admin.fail", "Wrong or missing admin code."));
  }

  /* ---------------------------------------------------------------- Logo (global, KV) */
  var logoFile = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-logo-file"));
  if (logoFile) {
    var _logoFile = logoFile; // non-null alias
    _logoFile.addEventListener("change", function () {
      var f = _logoFile.files && _logoFile.files[0];
      if (!f) return;
      if (f.size > 1572864) { alert(T("logo.toobig", "Logo too large (max 1.5 MB).")); _logoFile.value = ""; return; }
      var code = kitAdminCode();
      _logoFile.value = "";
      if (!code) return;
      var _code = code; // non-null alias
      var _f = f; // non-null alias
      /** @param {number} aspect */
      function send(aspect) {
        fetch("/api/logo", {
          method: "PUT",
          headers: { "x-kit-admin": _code, "x-kit-type": _f.type || "image/png", "x-kit-aspect": String(aspect || 4) },
          body: _f,
        }).then(function (r) {
          if (r.status === 401) { kitAdminFail(); return; }
          if (!r.ok) { alert(T("logo.fail", "Logo upload failed.")); return; }
          location.reload();
        }).catch(function () { alert(T("logo.fail", "Logo upload failed.")); });
      }
      // determine the aspect ratio for the server meta (fallback 4:1)
      var url = URL.createObjectURL(_f), im = new Image();
      im.onload = function () { var a = im.naturalWidth / (im.naturalHeight || 1); URL.revokeObjectURL(url); send(a); };
      im.onerror = function () { URL.revokeObjectURL(url); send(4); };
      im.src = url;
    });
  }
  var logoRm = document.getElementById("cz-logo-rm");
  if (logoRm) logoRm.addEventListener("click", function () {
    var code = kitAdminCode();
    if (!code) return;
    fetch("/api/logo", { method: "DELETE", headers: { "x-kit-admin": code } })
      .then(function (r) { if (r.status === 401) { kitAdminFail(); return; } location.reload(); })
      .catch(function () {});
  });

  /* ---------------------------------------------------------------- Looks */
  var looksEl = document.getElementById("cz-looks");
  function markLook() {
    var sv = gs("kitLook", null);
    if (looksEl) looksEl.querySelectorAll(":scope > *").forEach(function (x, i) { x.classList.toggle("on", String(i) === String(sv)); });
  }
  if (looksEl && _w.KIT_LOOKS) {
    var _looksEl = looksEl; // non-null alias
    var looks = /** @type {Array<Record<string,unknown>>} */ (/** @type {any} */ (I18N).looks);
    for (var lo = 0; lo < _w.KIT_LOOKS.length; lo++) {
      (function (idx) {
        var L = _w.KIT_LOOKS[idx];
        var Li = /** @type {Record<string,string>} */ ((looks && looks[idx]) || {});
        var b = document.createElement("button");
        b.className = "cz-look";
        var bb = document.createElement("b"); bb.textContent = Li["n"] || L.n;
        var sp = document.createElement("span"); sp.textContent = Li["d"] || L.d || "";
        b.appendChild(bb); b.appendChild(sp);
        b.addEventListener("click", function () { _w.kitLook(idx, true); syncAll(); });
        _looksEl.appendChild(b);
      })(lo);
    }
  }

  // Align the panel UI to the current state (after a look click / base change)
  function syncAll() {
    var fh = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fh-in")); if (fh) fh.value = curName("head");
    var fb = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fb-in")); if (fb) fb.value = curName("body");
    clearPairSel();
    document.querySelectorAll(".cz-seg").forEach(markSeg);
    markPal(); markLook(); syncColors();
  }
  markPal(); markLook(); syncColors();

  /* ---------------------------------------------------------------- Reset (personal only) */
  // Clears this browser's personal settings → back to the published global base
  // (or to the defaults if nothing is published).
  var resetBtn = document.getElementById("cz-reset");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    ["kitFontHead", "kitFontBody", "kitColors", "kitLayout", "kitType", "kitCard",
     "kitPalette", "kitBase", "kitLook", "kitPanelOpen", "kitStruct", "kitChrome", "kitAcc2"]
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    document.cookie = "kitstruct=;path=/;max-age=0";
    document.cookie = "kitchrome=;path=/;max-age=0";
    document.cookie = "kitpins=;path=/;max-age=0";
    location.reload();
  });

  /* ---------------------------------------------------------------- Publish globally */
  // Save the current skin settings + structure cookies as the global base in KV.
  var pubBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("cz-pub"));
  if (pubBtn) {
    var _pubBtn = pubBtn; // non-null alias
    _pubBtn.addEventListener("click", function () {
      var code = kitAdminCode();
      if (!code) return;
      var SKIN_KEYS = ["kitFontHead", "kitFontBody", "kitColors", "kitLayout", "kitType", "kitCard", "kitPalette", "kitBase", "kitLook"];
      /** @type {Record<string,string>} */
      var skin = {};
      for (var i = 0; i < SKIN_KEYS.length; i++) {
        try { var v = localStorage.getItem(SKIN_KEYS[i]); if (v != null) skin[SKIN_KEYS[i]] = v; } catch (e) {}
      }
      /** @param {string} name */
      function cookieValue(name) {
        var parts = document.cookie.split("; ");
        for (var j = 0; j < parts.length; j++) if (parts[j].indexOf(name + "=") === 0) return parts[j].slice(name.length + 1);
        return "";
      }
      var payload = { skin: skin, kitstruct: cookieValue("kitstruct"), kitchrome: cookieValue("kitchrome"), kitpins: cookieValue("kitpins") };
      var orig = _pubBtn.textContent;
      _pubBtn.disabled = true;
      _pubBtn.textContent = T("pub.saving", "Saving …");
      fetch("/api/config", {
        method: "PUT",
        headers: { "x-kit-admin": code, "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(function (r) {
        _pubBtn.disabled = false;
        if (r.status === 401) { _pubBtn.textContent = orig; kitAdminFail(); return; }
        if (!r.ok) { _pubBtn.textContent = orig; alert(T("pub.fail", "Publishing failed.")); return; }
        _pubBtn.textContent = T("pub.done", "✓ Published for all");
        setTimeout(function () { _pubBtn.textContent = orig; }, 2200);
      }).catch(function () { _pubBtn.disabled = false; _pubBtn.textContent = orig; alert(T("pub.fail", "Publishing failed.")); });
    });
  }

  /* ---------------------------------------------------------------- Publish status + revert */
  // "Last published" display + jump back to the previous version (PATCH /api/config).
  var pubTs = document.getElementById("cz-pub-ts");
  var pubUndo = /** @type {HTMLButtonElement|null} */ (document.getElementById("cz-pub-undo"));
  function refreshPubMeta() {
    if (!pubTs) return;
    var _pubTs = pubTs; // non-null alias
    fetch("/api/config").then(function (r) { return r.json(); }).then(function (j) {
      _pubTs.textContent = (j && j.ts)
        ? T("pub.stand", "Published: ") + new Date(j.ts).toLocaleString(_w.KIT_LOCALE || "de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : T("pub.none", "Nothing published yet");
    }).catch(function () { _pubTs.textContent = "–"; });
  }
  refreshPubMeta();
  if (pubUndo) {
    var _pubUndo = pubUndo; // non-null alias
    _pubUndo.addEventListener("click", function () {
      var code = kitAdminCode();
      if (!code) return;
      _pubUndo.disabled = true;
      fetch("/api/config", { method: "PATCH", headers: { "x-kit-admin": code } }).then(function (r) {
        _pubUndo.disabled = false;
        if (r.status === 401) { kitAdminFail(); return; }
        if (r.status === 404) { alert(T("undo.none", "No previous version available.")); return; }
        if (!r.ok) { alert(T("undo.fail", "Revert failed.")); return; }
        location.reload(); // the previous version is now active
      }).catch(function () { _pubUndo.disabled = false; });
    });
  }

  /* ---------------------------------------------------------------- Post reactions */
  // Clap: KV counter via /api/react (optimistic UI); share: Web Share API → clipboard fallback.
  var clapBtn = document.getElementById("js-clap");
  if (clapBtn) {
    var _clapBtn = clapBtn; // non-null alias
    var clapN = document.getElementById("js-clap-n");
    var clapBusy = false;
    _clapBtn.addEventListener("click", function () {
      if (clapBusy) return;
      clapBusy = true;
      setTimeout(function () { clapBusy = false; }, 400); // throttle multi-clicks
      if (clapN) clapN.textContent = String((parseInt(clapN.textContent || "0", 10) || 0) + 1);
      fetch("/api/react?g=" + encodeURIComponent(_clapBtn.getAttribute("data-guid") || ""), { method: "POST" })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (clapN && j && typeof j.n === "number") clapN.textContent = String(j.n); })
        .catch(function () {});
    });
  }
  var shareBtn = document.getElementById("js-share");
  if (shareBtn) {
    var _shareBtn = shareBtn; // non-null alias
    _shareBtn.addEventListener("click", function () {
      var title = _shareBtn.getAttribute("data-title") || document.title;
      var url = location.href;
      var label = document.getElementById("js-share-t");
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          if (label) { var _label = label; _label.textContent = T("share.copied", "Link copied ✓"); setTimeout(function () { _label.textContent = T("share", "Share"); }, 1800); }
        }).catch(function () {});
      }
    });
  }

  /* ---------------------------------------------------------------- "load more" */
  // Fetches the next server page (?page=N) and appends only its teaser cards to the grid.
  var loadMoreBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("js-loadmore"));
  if (loadMoreBtn) {
    var _loadMoreBtn = loadMoreBtn; // non-null alias
    _loadMoreBtn.addEventListener("click", function () {
      var next = parseInt(_loadMoreBtn.getAttribute("data-next") || "0", 10);
      var pages = parseInt(_loadMoreBtn.getAttribute("data-pages") || "0", 10);
      _loadMoreBtn.disabled = true;
      _loadMoreBtn.textContent = T("loading", "Loading …");
      var base = _loadMoreBtn.getAttribute("data-url") || "/";
      var sep = base.indexOf("?") >= 0 ? "&" : "?";
      fetch(base + sep + "page=" + next).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var grid = document.querySelector(".grid");
        if (grid) { var _grid = grid; doc.querySelectorAll(".grid .card").forEach(function (c) { _grid.appendChild(document.importNode(c, true)); }); }
        injectPins(); // make freshly loaded cards pinnable too
        next++;
        _loadMoreBtn.setAttribute("data-next", String(next));
        _loadMoreBtn.disabled = false;
        _loadMoreBtn.textContent = T("loadmore", "Load more");
        if (next > pages) _loadMoreBtn.style.display = "none";
      }).catch(function () { _loadMoreBtn.disabled = false; _loadMoreBtn.textContent = T("loadmore", "Load more"); });
    });
  }

  /* ---------------------------------------------------------------- Pin posts */
  // Visible in editing mode (panel open → html.cz-on, via CSS). Pinning writes a
  // personal kitpins cookie {scope:[guid]}; it goes global only via "Publish for all"
  // (admin-gated). Scope = the current page.
  /** @returns {string|null} "/" | "rubrik/<slug>" | null */
  function pinScope() {
    var p = location.pathname;
    if (p === "/" || p === "") return "/";
    var m = p.match(/^\/rubrik\/([^/]+)\/?$/);
    return m ? "rubrik/" + decodeURIComponent(m[1]) : null;
  }
  /** @returns {Record<string,string[]>} */
  function pinsRead() {
    var m = document.cookie.match(/(?:^|;\s*)kitpins=([^;]*)/);
    if (!m) return {};
    try { var o = JSON.parse(decodeURIComponent(m[1])); return (o && typeof o === "object") ? o : {}; }
    catch (e) { return {}; }
  }
  /** @param {Record<string,string[]>} map */
  function pinsWrite(map) {
    document.cookie = "kitpins=" + encodeURIComponent(JSON.stringify(map)) + ";path=/;max-age=31536000";
    location.reload();
  }
  var PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.8V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6.8a2 2 0 0 0 1.1 1.8l1.8.9A2 2 0 0 1 19 15.2V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-.8a2 2 0 0 1 1.1-1.8l1.8-.9A2 2 0 0 0 9 10.8Z"/></svg>';
  // Pinnable elements: lead story/hero (pin 1 lands there) + the card family.
  var PIN_TARGETS = [
    { sel: "section.hero", meta: ".hero__date" },
    { sel: "article.aufmacher", meta: ".aufmacher__meta" },
    { sel: "a.card", meta: ".card__date" },
    { sel: "a.teaser-row", meta: ".card__date" },
    { sel: "a.teaser-text", meta: ".card__date" },
    { sel: "a.feat-main", meta: ".card__date" }
  ];
  // Idempotent + re-callable (e.g. after "load more"). Scope per card: the nearest
  // [data-pin-scope] (section block = its own scope), otherwise the page scope.
  function injectPins() {
    var pageScope = pinScope();
    if (!pageScope) return;
    var pins = pinsRead();
    for (var ti = 0; ti < PIN_TARGETS.length; ti++) {
      var found = document.querySelectorAll(PIN_TARGETS[ti].sel);
      var metaSel = PIN_TARGETS[ti].meta;
      for (var fi = 0; fi < found.length; fi++) {
        (function (cardEl, metaSel) {
          var a = (cardEl.tagName === "A" && cardEl.getAttribute("href")) ? cardEl : cardEl.querySelector('a[href^="/posts/"]');
          var href = a ? (a.getAttribute("href") || "") : "";
          var mm = href.match(/^\/posts\/(.+)$/);
          if (!mm) return;
          var guid = decodeURIComponent(mm[1]);
          var meta = cardEl.querySelector(metaSel);
          if (!meta || meta.querySelector(".card__pin")) return;
          var scopeEl = cardEl.closest("[data-pin-scope]");
          var cardScope = scopeEl ? (scopeEl.getAttribute("data-pin-scope") || pageScope) : pageScope;
          var pinned = (Array.isArray(pins[cardScope]) ? pins[cardScope] : []).indexOf(guid) >= 0;
          var btn = document.createElement("span");
          btn.className = "card__pin" + (pinned ? " is-pinned" : "");
          btn.setAttribute("role", "button");
          btn.setAttribute("tabindex", "0");
          btn.setAttribute("aria-pressed", pinned ? "true" : "false");
          btn.setAttribute("aria-label", pinned ? T("pin.remove", "Remove pin") : T("pin.add", "Pin to top"));
          btn.innerHTML = PIN_SVG + '<span class="card__pin-t">' + T("pin.label", "Pinned") + "</span>";
          /** @param {Event} e */
          function toggle(e) {
            e.preventDefault(); e.stopPropagation();
            var map = pinsRead();
            var l = Array.isArray(map[cardScope]) ? map[cardScope].slice() : [];
            var at = l.indexOf(guid);
            if (at >= 0) { l.splice(at, 1); }
            else {
              if (l.length >= 3) { alert(T("pin.max", "Maximum 3 posts per section.")); return; }
              l.push(guid);
            }
            if (l.length) map[cardScope] = l; else delete map[cardScope];
            pinsWrite(map);
          }
          btn.addEventListener("click", toggle);
          btn.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { toggle(e); } });
          meta.appendChild(btn);
        })(found[fi], metaSel);
      }
    }
  }
  injectPins();
})();
