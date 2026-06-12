// @ts-check
/* kit-panel.js — Logik des Customizer-Panels (läuft am Ende von <body>, Panel-DOM existiert).
 *
 * Arbeitsteilung: kit-theme.js stellt Kataloge + Setter bereit (_w.kit*);
 * diese Datei verdrahtet die Panel-Controls damit. Generische Regler sind über
 * data-Attribute gebunden: data-fn (Setter-Familie) + data-kind (Regler) + data-v (Wert).
 *
 * Persistenz: persönliche Einstellungen in localStorage/Cookies; „Für alle Besucher
 * speichern" veröffentlicht sie global über PUT /api/config (Admin-Code, KV).
 */

// Kurzreferenz auf window mit Kit-Erweiterungen (Typedef in kit-theme.js).
// In der Browser-Seite sind beide Dateien geladen; tsc prüft sie gemeinsam (tsconfig.browser.json).
/** @type {Window & typeof globalThis & KitWindowExtensions} */
var _w = /** @type {any} */ (window);
(function () {
  var D = document.documentElement;

  /* — i18n: page.js injiziert _w.KIT_I18N (Sprache aus kit.config.js).
       Die deutschen Literale bleiben als eingebauter Fallback. — */
  /** @type {Record<string,unknown>} */
  var I18N = /** @type {Record<string,unknown>} */ (_w.KIT_I18N || {});
  /** @param {string} key @param {string} fallback */
  function T(key, fallback) { return I18N[key] != null ? /** @type {string} */ (I18N[key]) : fallback; }

  /* — Storage-Helfer: localStorage zuerst, dann global veröffentlichte Basis — */
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

  /* ---------------------------------------------------------------- Öffnen/Schließen + Akkordeon */
  /** @param {boolean} open */
  function setOpen(open) {
    D.classList.toggle("cz-on", open);
    try { localStorage.setItem("kitPanelOpen", open ? "1" : "0"); } catch (e) {}
  }
  var openBtn = document.getElementById("cz-open"), closeBtn = document.getElementById("cz-close");
  if (openBtn) openBtn.addEventListener("click", function () { setOpen(true); if (closeBtn) closeBtn.focus(); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); if (openBtn) openBtn.focus(); });
  // ESC schließt das Panel (Suche/Dialoge fangen ESC selbst ab)
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && D.classList.contains("cz-on")) { setOpen(false); if (openBtn) openBtn.focus(); }
  });

  // Offene Sektionen als Index-Liste merken (kitAcc2), beim Laden wiederherstellen
  function saveAccordion() {
    /** @type {number[]} */
    var open = [];
    document.querySelectorAll(".cz-sec").forEach(function (s, i) { if (s.classList.contains("cz-open")) open.push(i); });
    try { localStorage.setItem("kitAcc2", JSON.stringify(open)); } catch (e) {}
  }
  (function restoreAccordion() {
    /** @type {number[]|null} */
    var a = null;
    try { a = JSON.parse(localStorage.getItem("kitAcc2") || "null"); } catch (e) {}
    if (a && typeof a.length === "number") {
      document.querySelectorAll(".cz-sec").forEach(function (s, i) { s.classList.toggle("cz-open", a !== null && a.indexOf(i) >= 0); });
    }
  })();
  document.querySelectorAll(".cz-sh[data-acc]").forEach(function (h) {
    h.addEventListener("click", function () { if (h.parentElement) h.parentElement.classList.toggle("cz-open"); saveAccordion(); });
  });

  // Jede manuelle Änderung löst die Look-Markierung (kein Look mehr „aktiv")
  function clearLook() {
    try { localStorage.removeItem("kitLook"); } catch (e) {}
    markLook();
  }

  /* ---------------------------------------------------------------- Schriften */
  // Such-Comboboxen über kuratierte Favoriten + den kompletten Bunny-Katalog (lazy).
  _w.KIT_BUNNY = _w.KIT_BUNNY || {};
  _w.KIT_BUNNY_LIST = _w.KIT_BUNNY_LIST || [];
  var bunnyState = 0; // 0 = nicht geladen, 1 = lädt, 2 = fertig
  /** @type {Array<() => void>} */
  var bunnyCallbacks = [];

  /** @param {string} s */
  function titleCase(s) {
    var p = String(s || "").split("-");
    for (var i = 0; i < p.length; i++) p[i] = p[i].charAt(0).toUpperCase() + p[i].slice(1);
    return p.join(" ");
  }
  /** @param {string} category */
  function genericOf(category) {
    if (category === "serif") return "serif";
    if (category === "monospace") return "monospace";
    if (category === "handwriting") return "cursive";
    return "sans-serif";
  }
  // sinnvolle Gewichte herausfiltern (300–800); leere Liste → erstes verfügbares
  /** @param {number[]} arr */
  function weightsOf(arr) {
    if (!arr || !arr.length) return "400,700";
    var keep = /** @type {number[]} */ ([]), want = [300, 400, 500, 600, 700, 800];
    for (var i = 0; i < arr.length; i++) if (want.indexOf(arr[i]) >= 0) keep.push(arr[i]);
    if (!keep.length) keep = [arr[0]];
    return keep.join(",");
  }
  /** @param {(() => void)|null} [cb] */
  function loadBunny(cb) {
    if (bunnyState === 2) { cb && cb(); return; }
    if (cb) bunnyCallbacks.push(cb);
    if (bunnyState === 1) return;
    bunnyState = 1;
    function done() { for (var z = 0; z < bunnyCallbacks.length; z++) bunnyCallbacks[z](); bunnyCallbacks = []; }
    fetch("https://fonts.bunny.net/list").then(function (r) { return r.json(); }).then(function (j) {
      var keys = Object.keys(j);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], f = j[k];
        _w.KIT_BUNNY[k] = { s: k, n: f.familyName || titleCase(k), g: genericOf(f.category), w: weightsOf(f.weights), c: f.category || "" };
        _w.KIT_BUNNY_LIST.push(_w.KIT_BUNNY[k]);
      }
      _w.KIT_BUNNY_LIST.sort(function (a, b) { var x = a.n.toLowerCase(), y = b.n.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; });
      bunnyState = 2;
      done();
    }).catch(function () { bunnyState = 0; done(); });
  }
  // Suchpool: Favoriten zuerst, dann der restliche Katalog (max. 60 Treffer)
  function fontPool() {
    /** @type {Record<string,number>} */
    var seen = {};
    /** @type {KitFont[]} */
    var out = [];
    for (var i = 0; i < _w.KIT_FONTS.length; i++) { out.push(_w.KIT_FONTS[i]); seen[_w.KIT_FONTS[i].s] = 1; }
    for (var j = 0; j < _w.KIT_BUNNY_LIST.length; j++) if (!seen[_w.KIT_BUNNY_LIST[j].s]) out.push(_w.KIT_BUNNY_LIST[j]);
    return out;
  }
  /** @param {string} q */
  function fontMatch(q) {
    q = (q || "").toLowerCase();
    var pool = fontPool(), res = /** @type {KitFont[]} */ ([]);
    for (var i = 0; i < pool.length && res.length < 60; i++) {
      var f = pool[i];
      if (!q || f.n.toLowerCase().indexOf(q) >= 0 || f.s.indexOf(q) >= 0) res.push(f);
    }
    return res;
  }
  // Anzeigename der aktuell gespeicherten Schrift (JSON-Deskriptor oder Legacy-Slug)
  /** @param {string} role */
  function curName(role) {
    var v = /** @type {string} */ (gs(role === "head" ? "kitFontHead" : "kitFontBody", role === "head" ? _w.KIT_DEFAULT_HEAD : _w.KIT_DEFAULT_BODY));
    if (v && v.charAt(0) === "{") { try { var o = JSON.parse(v); if (o && o.n) return o.n; } catch (e) {} }
    for (var i = 0; i < _w.KIT_FONTS.length; i++) if (_w.KIT_FONTS[i].s === v) return _w.KIT_FONTS[i].n;
    if (_w.KIT_BUNNY && _w.KIT_BUNNY[v]) return _w.KIT_BUNNY[v].n;
    return titleCase(v);
  }

  var pairSel = /** @type {HTMLSelectElement|null} */ (document.getElementById("pair-picker"));

  /**
   * @param {string} role
   * @param {string} inputId
   * @param {string} popupId
   */
  function setupFontBox(role, inputId, popupId) {
    var inp = /** @type {HTMLInputElement|null} */ (document.getElementById(inputId));
    var pop = /** @type {HTMLElement|null} */ (document.getElementById(popupId));
    if (!inp || !pop) return;
    var _inp = inp, _pop = pop; // nicht-null Aliase für Closures
    _inp.value = curName(role);
    /** @param {string} q */
    function render(q) {
      var res = fontMatch(q);
      _pop.innerHTML = "";
      for (var i = 0; i < res.length; i++) {
        (function (f) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "cz-font-opt";
          var nm = document.createElement("span"); nm.textContent = f.n;
          var cats = /** @type {Record<string,string>|undefined} */ (/** @type {any} */ (I18N).cats);
          var ct = document.createElement("em"); ct.textContent = (cats && cats[f.c]) || f.c || f.g || "";
          b.appendChild(nm); b.appendChild(ct);
          // mousedown statt click: feuert vor dem blur des Inputs (Popup bleibt benutzbar)
          b.addEventListener("mousedown", function (e) {
            e.preventDefault();
            _w.kitApplyFont(role, f, true);
            _inp.value = f.n;
            _pop.classList.remove("open");
            if (pairSel) pairSel.value = "";
            clearLook();
          });
          _pop.appendChild(b);
        })(res[i]);
      }
      _pop.classList.toggle("open", res.length > 0);
    }
    _inp.addEventListener("focus", function () {
      _inp.select();
      render("");
      loadBunny(function () { if (document.activeElement === _inp) render(_inp.value && _inp.value !== curName(role) ? _inp.value : ""); });
    });
    _inp.addEventListener("input", function () { render(_inp.value); });
    _inp.addEventListener("blur", function () { setTimeout(function () { _pop.classList.remove("open"); }, 170); });
  }
  setupFontBox("head", "cz-fh-in", "cz-fh-pop");
  setupFontBox("body", "cz-fb-in", "cz-fb-pop");

  // Schrift-Paare (Vorlagen)
  if (pairSel && _w.KIT_PAIRS) {
    var _pairSel = pairSel; // nicht-null Alias
    for (var pi = 0; pi < _w.KIT_PAIRS.length; pi++) {
      var pp = _w.KIT_PAIRS[pi];
      var po = document.createElement("option");
      var pairs = /** @type {Record<number,string>|undefined} */ (/** @type {any} */ (I18N).pairs);
      po.value = String(pi); po.textContent = (pairs && pairs[pi]) || pp.n;
      _pairSel.appendChild(po);
    }
    _pairSel.addEventListener("change", function () {
      var pr = _w.KIT_PAIRS[parseInt(_pairSel.value, 10)];
      if (!pr) return;
      _w.kitApplyFont("head", pr.h, true);
      _w.kitApplyFont("body", pr.b, true);
      var fh = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fh-in")); if (fh) fh.value = curName("head");
      var fb = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fb-in")); if (fb) fb.value = curName("body");
      clearLook();
    });
  }

  // „Feinschliff" auf-/zuklappen
  var moreBtn = document.getElementById("cz-type-more"), moreBody = document.getElementById("cz-type-adv");
  if (moreBtn && moreBody) {
    var _moreBtn = moreBtn, _moreBody = moreBody; // nicht-null Aliase
    _moreBtn.addEventListener("click", function () {
      var open = _moreBody.classList.toggle("open");
      _moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------------------------------------------------------------- Farben + Kontrast-Wächter */
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
  // Schema-Swatches: zweifarbig (Akzent + tatsächlicher Hintergrund), dunkle Schemas markiert
  if (pal && _w.KIT_PALETTES) {
    for (var qi = 0; qi < _w.KIT_PALETTES.length; qi++) {
      (function (idx) {
        var p = _w.KIT_PALETTES[idx];
        var b = document.createElement("button");
        var i18nPalettes = /** @type {Record<number,string>|undefined} */ (/** @type {any} */ (I18N).palettes);
        b.title = ((i18nPalettes && i18nPalettes[idx]) || p.n)
          + ((_w.KIT_RL && _w.KIT_RL(p.v["--color-bg"] || "#FFFFFF") < 0.42) ? T("palette.dark", " (dunkel)") : "");
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

  /* ---------------------------------------------------------------- Generische Segmente */
  // data-fn wählt die Setter-Familie, data-kind den Regler, data-v den Wert.
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

  /* ---------------------------------------------------------------- Seitenleisten (nur Portal) */
  var railsEl = document.getElementById("cz-rails");
  if (railsEl) {
    var _railsEl = railsEl; // nicht-null Alias
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

  /* ---------------------------------------------------------------- Header: Titel + Navigation */
  var navEd = document.getElementById("cz-nav");
  var footEd = document.getElementById("cz-foot");
  var brandInp = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-brand"));

  /** @type {{ brand?: string, nav?: Array<{l:string,h:string,x:boolean}>, foot?: Array<{l:string,h:string,x:boolean}> }} */
  var savedChrome = {};
  try { savedChrome = JSON.parse(localStorage.getItem("kitChrome") || "{}"); } catch (e) {}
  if (brandInp) brandInp.value = savedChrome.brand || _w.KIT_DEFAULT_BRAND || "";

  /** Liest alle Nav-Zeilen aus einem Editor-Container und gibt das Array zurück. */
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

  /** Sammelt brand + nav + foot aus dem Panel und schreibt kitchrome → Reload. */
  function writeChrome() {
    var brand = brandInp ? brandInp.value.trim() : "";
    var nav = navEd ? collectRows(navEd) : (savedChrome.nav || []);
    var foot = footEd ? collectRows(footEd) : (savedChrome.foot || []);
    _w.kitChromeSet({ brand: brand, nav: nav, foot: foot }); // → Reload
  }

  if (navEd) {
    var _navEd = navEd; // nicht-null Alias

    // Initiale Liste: gespeichert > aktuelle Seiten-Nav (DOM) > Default
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
    // Eine editierbare Nav-Zeile: Grip (Drag + Pfeiltasten) | Label | URL | Entfernen
    /** @param {Element} container @param {{ l?: string, h?: string, x?: boolean }|undefined} [n] */
    function navRow(container, n) {
      var row = document.createElement("div"); row.className = "cz-nav-row";
      var grip = document.createElement("button");
      grip.type = "button"; grip.className = "cz-nav-grip"; grip.textContent = "⠿";
      grip.title = T("nav.grip.title", "Ziehen oder Pfeiltasten zum Sortieren"); grip.setAttribute("aria-label", T("nav.grip.aria", "Link verschieben"));
      var label = document.createElement("input"); label.className = "cz-nav-l"; label.placeholder = T("nav.label.ph", "Label"); label.value = (n && n.l) || "";
      var href = document.createElement("input"); href.className = "cz-nav-h"; href.placeholder = T("nav.url.ph", "URL"); href.value = (n && n.h) || "";
      var del = document.createElement("button"); del.type = "button"; del.className = "cz-nav-x"; del.textContent = "×"; del.title = T("nav.remove", "Entfernen");
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
    var _footEd = footEd; // nicht-null Alias

    // Initiale Footer-Links aus kitchrome
    /** @type {Array<{l:string,h:string,x?:boolean}>} */
    var footInit = savedChrome.foot || [];

    // Footer-Zeile: Label | URL | Entfernen (kein Drag-Grip — Reihenfolge weniger kritisch)
    /** @param {{ l?: string, h?: string, x?: boolean }|undefined} [n] */
    function footRow(n) {
      var row = document.createElement("div"); row.className = "cz-nav-row";
      var label = document.createElement("input"); label.className = "cz-nav-l"; label.placeholder = T("nav.label.ph", "Label"); label.value = (n && n.l) || "";
      var href = document.createElement("input"); href.className = "cz-nav-h"; href.placeholder = T("nav.url.ph", "URL"); href.value = (n && n.h) || "";
      var del = document.createElement("button"); del.type = "button"; del.className = "cz-nav-x"; del.textContent = "×"; del.title = T("nav.remove", "Entfernen");
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

  /* ---------------------------------------------------------------- Suche (feed-basiert, /api/search) */
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
        if (query) { var p = document.createElement("p"); p.className = "kit-search__empty"; p.textContent = T("search.empty", 'Keine Treffer für „{q}“.').split("{q}").join(query); sRes.appendChild(p); }
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
    // Klick auf den Backdrop (= das dialog-Element selbst) schließt
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

  /* ---------------------------------------------------------------- Admin-Code (globales Schreiben) */
  // Der Code wird einmal abgefragt und im Browser gemerkt; der Server prüft jede Anfrage
  // gegen das Secret KIT_ADMIN_CODE (401 → gemerkten Code verwerfen).
  function kitAdminCode() {
    var c = null;
    try { c = localStorage.getItem("kitAdmin"); } catch (e) {}
    if (!c) {
      c = window.prompt(T("admin.prompt", "Admin-Code für globale Änderungen:"));
      if (c) { c = c.trim(); try { localStorage.setItem("kitAdmin", c); } catch (e) {} }
    }
    return c;
  }
  function kitAdminFail() {
    try { localStorage.removeItem("kitAdmin"); } catch (e) {}
    alert(T("admin.fail", "Admin-Code falsch oder fehlt."));
  }

  /* ---------------------------------------------------------------- Logo (global, KV) */
  var logoFile = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-logo-file"));
  if (logoFile) {
    var _logoFile = logoFile; // nicht-null Alias
    _logoFile.addEventListener("change", function () {
      var f = _logoFile.files && _logoFile.files[0];
      if (!f) return;
      if (f.size > 1572864) { alert(T("logo.toobig", "Logo zu groß (max. 1,5 MB).")); _logoFile.value = ""; return; }
      var code = kitAdminCode();
      _logoFile.value = "";
      if (!code) return;
      var _code = code; // nicht-null Alias
      var _f = f; // nicht-null Alias
      /** @param {number} aspect */
      function send(aspect) {
        fetch("/api/logo", {
          method: "PUT",
          headers: { "x-kit-admin": _code, "x-kit-type": _f.type || "image/png", "x-kit-aspect": String(aspect || 4) },
          body: _f,
        }).then(function (r) {
          if (r.status === 401) { kitAdminFail(); return; }
          if (!r.ok) { alert(T("logo.fail", "Logo-Upload fehlgeschlagen.")); return; }
          location.reload();
        }).catch(function () { alert(T("logo.fail", "Logo-Upload fehlgeschlagen.")); });
      }
      // Seitenverhältnis fürs Server-Meta ermitteln (Fallback 4:1)
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
    var _looksEl = looksEl; // nicht-null Alias
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

  // Panel-UI an den aktuellen Zustand angleichen (nach Look-Klick / Basis-Wechsel)
  function syncAll() {
    var fh = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fh-in")); if (fh) fh.value = curName("head");
    var fb = /** @type {HTMLInputElement|null} */ (document.getElementById("cz-fb-in")); if (fb) fb.value = curName("body");
    if (pairSel) pairSel.value = "";
    document.querySelectorAll(".cz-seg").forEach(markSeg);
    markPal(); markLook(); syncColors();
  }
  markPal(); markLook(); syncColors();

  /* ---------------------------------------------------------------- Reset (nur persönlich) */
  // Löscht die persönlichen Einstellungen dieses Browsers → zurück zur veröffentlichten
  // globalen Basis (bzw. zu den Defaults, wenn nichts veröffentlicht ist).
  var resetBtn = document.getElementById("cz-reset");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    ["kitFontHead", "kitFontBody", "kitColors", "kitLayout", "kitType", "kitCard",
     "kitPalette", "kitBase", "kitLook", "kitPanelOpen", "kitStruct", "kitChrome", "kitAcc2"]
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    document.cookie = "kitstruct=;path=/;max-age=0";
    document.cookie = "kitchrome=;path=/;max-age=0";
    location.reload();
  });

  /* ---------------------------------------------------------------- Global veröffentlichen */
  // Aktuelle Skin-Einstellungen + Struktur-Cookies als globale Basis in KV speichern.
  var pubBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("cz-pub"));
  if (pubBtn) {
    var _pubBtn = pubBtn; // nicht-null Alias
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
      var payload = { skin: skin, kitstruct: cookieValue("kitstruct"), kitchrome: cookieValue("kitchrome") };
      var orig = _pubBtn.textContent;
      _pubBtn.disabled = true;
      _pubBtn.textContent = T("pub.saving", "Speichert …");
      fetch("/api/config", {
        method: "PUT",
        headers: { "x-kit-admin": code, "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(function (r) {
        _pubBtn.disabled = false;
        if (r.status === 401) { _pubBtn.textContent = orig; kitAdminFail(); return; }
        if (!r.ok) { _pubBtn.textContent = orig; alert(T("pub.fail", "Speichern fehlgeschlagen.")); return; }
        _pubBtn.textContent = T("pub.done", "✓ Für alle gespeichert");
        setTimeout(function () { _pubBtn.textContent = orig; }, 2200);
      }).catch(function () { _pubBtn.disabled = false; _pubBtn.textContent = orig; alert(T("pub.fail", "Speichern fehlgeschlagen.")); });
    });
  }

  /* ---------------------------------------------------------------- Publish-Status + Revert */
  // „Zuletzt veröffentlicht"-Anzeige + Rücksprung zur Vorversion (PATCH /api/config).
  var pubTs = document.getElementById("cz-pub-ts");
  var pubUndo = /** @type {HTMLButtonElement|null} */ (document.getElementById("cz-pub-undo"));
  function refreshPubMeta() {
    if (!pubTs) return;
    var _pubTs = pubTs; // nicht-null Alias
    fetch("/api/config").then(function (r) { return r.json(); }).then(function (j) {
      _pubTs.textContent = (j && j.ts)
        ? T("pub.stand", "Stand: ") + new Date(j.ts).toLocaleString(_w.KIT_LOCALE || "de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : T("pub.none", "Noch nichts veröffentlicht");
    }).catch(function () { _pubTs.textContent = "–"; });
  }
  refreshPubMeta();
  if (pubUndo) {
    var _pubUndo = pubUndo; // nicht-null Alias
    _pubUndo.addEventListener("click", function () {
      var code = kitAdminCode();
      if (!code) return;
      _pubUndo.disabled = true;
      fetch("/api/config", { method: "PATCH", headers: { "x-kit-admin": code } }).then(function (r) {
        _pubUndo.disabled = false;
        if (r.status === 401) { kitAdminFail(); return; }
        if (r.status === 404) { alert(T("undo.none", "Keine Vorversion vorhanden.")); return; }
        if (!r.ok) { alert(T("undo.fail", "Zurücknehmen fehlgeschlagen.")); return; }
        location.reload(); // Vorversion ist jetzt aktiv
      }).catch(function () { _pubUndo.disabled = false; });
    });
  }

  /* ---------------------------------------------------------------- Post-Reaktionen */
  // Clap: KV-Zähler über /api/react (optimistisches UI); Teilen: Web Share API → Clipboard-Fallback.
  var clapBtn = document.getElementById("js-clap");
  if (clapBtn) {
    var _clapBtn = clapBtn; // nicht-null Alias
    var clapN = document.getElementById("js-clap-n");
    var clapBusy = false;
    _clapBtn.addEventListener("click", function () {
      if (clapBusy) return;
      clapBusy = true;
      setTimeout(function () { clapBusy = false; }, 400); // Mehrfach-Klicks drosseln
      if (clapN) clapN.textContent = String((parseInt(clapN.textContent || "0", 10) || 0) + 1);
      fetch("/api/react?g=" + encodeURIComponent(_clapBtn.getAttribute("data-guid") || ""), { method: "POST" })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (clapN && j && typeof j.n === "number") clapN.textContent = String(j.n); })
        .catch(function () {});
    });
  }
  var shareBtn = document.getElementById("js-share");
  if (shareBtn) {
    var _shareBtn = shareBtn; // nicht-null Alias
    _shareBtn.addEventListener("click", function () {
      var title = _shareBtn.getAttribute("data-title") || document.title;
      var url = location.href;
      var label = document.getElementById("js-share-t");
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          if (label) { var _label = label; _label.textContent = T("share.copied", "Link kopiert ✓"); setTimeout(function () { _label.textContent = T("share", "Teilen"); }, 1800); }
        }).catch(function () {});
      }
    });
  }

  /* ---------------------------------------------------------------- „Mehr laden" */
  // Holt die nächste Server-Seite (?page=N) und hängt nur deren Teaser-Karten ans Grid.
  var loadMoreBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById("js-loadmore"));
  if (loadMoreBtn) {
    var _loadMoreBtn = loadMoreBtn; // nicht-null Alias
    _loadMoreBtn.addEventListener("click", function () {
      var next = parseInt(_loadMoreBtn.getAttribute("data-next") || "0", 10);
      var pages = parseInt(_loadMoreBtn.getAttribute("data-pages") || "0", 10);
      _loadMoreBtn.disabled = true;
      _loadMoreBtn.textContent = T("loading", "Lädt …");
      var base = _loadMoreBtn.getAttribute("data-url") || "/";
      var sep = base.indexOf("?") >= 0 ? "&" : "?";
      fetch(base + sep + "page=" + next).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var grid = document.querySelector(".grid");
        if (grid) { var _grid = grid; doc.querySelectorAll(".grid .card").forEach(function (c) { _grid.appendChild(document.importNode(c, true)); }); }
        next++;
        _loadMoreBtn.setAttribute("data-next", String(next));
        _loadMoreBtn.disabled = false;
        _loadMoreBtn.textContent = T("loadmore", "Mehr laden");
        if (next > pages) _loadMoreBtn.style.display = "none";
      }).catch(function () { _loadMoreBtn.disabled = false; _loadMoreBtn.textContent = T("loadmore", "Mehr laden"); });
    });
  }
})();
