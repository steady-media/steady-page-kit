/* kit-panel.js — Logik des Customizer-Panels (läuft am Ende von <body>, Panel-DOM existiert).
 *
 * Arbeitsteilung: kit-theme.js stellt Kataloge + Setter bereit (window.kit*);
 * diese Datei verdrahtet die Panel-Controls damit. Generische Regler sind über
 * data-Attribute gebunden: data-fn (Setter-Familie) + data-kind (Regler) + data-v (Wert).
 *
 * Persistenz: persönliche Einstellungen in localStorage/Cookies; „Für alle Besucher
 * speichern" veröffentlicht sie global über PUT /api/config (Admin-Code, KV).
 */
(function () {
  var D = document.documentElement;

  /* — Storage-Helfer: localStorage zuerst, dann global veröffentlichte Basis — */
  function gs(k, d) {
    try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {}
    if (window.KIT_GLOBAL && window.KIT_GLOBAL[k] != null) return window.KIT_GLOBAL[k];
    return d;
  }
  function jget(k) {
    var v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (v == null && window.KIT_GLOBAL && window.KIT_GLOBAL[k] != null) v = window.KIT_GLOBAL[k];
    if (v != null) { try { return JSON.parse(v); } catch (e) {} }
    return {};
  }

  /* ---------------------------------------------------------------- Öffnen/Schließen + Akkordeon */
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
    var open = [];
    [].forEach.call(document.querySelectorAll(".cz-sec"), function (s, i) { if (s.classList.contains("cz-open")) open.push(i); });
    try { localStorage.setItem("kitAcc2", JSON.stringify(open)); } catch (e) {}
  }
  (function restoreAccordion() {
    var a = null;
    try { a = JSON.parse(localStorage.getItem("kitAcc2") || "null"); } catch (e) {}
    if (a && typeof a.length === "number") {
      [].forEach.call(document.querySelectorAll(".cz-sec"), function (s, i) { s.classList.toggle("cz-open", a.indexOf(i) >= 0); });
    }
  })();
  [].forEach.call(document.querySelectorAll(".cz-sh[data-acc]"), function (h) {
    h.addEventListener("click", function () { h.parentNode.classList.toggle("cz-open"); saveAccordion(); });
  });

  // Jede manuelle Änderung löst die Look-Markierung (kein Look mehr „aktiv")
  function clearLook() {
    try { localStorage.removeItem("kitLook"); } catch (e) {}
    markLook();
  }

  /* ---------------------------------------------------------------- Schriften */
  // Such-Comboboxen über kuratierte Favoriten + den kompletten Bunny-Katalog (lazy).
  window.KIT_BUNNY = window.KIT_BUNNY || {};
  window.KIT_BUNNY_LIST = window.KIT_BUNNY_LIST || [];
  var bunnyState = 0; // 0 = nicht geladen, 1 = lädt, 2 = fertig
  var bunnyCallbacks = [];

  function titleCase(s) {
    var p = String(s || "").split("-");
    for (var i = 0; i < p.length; i++) p[i] = p[i].charAt(0).toUpperCase() + p[i].slice(1);
    return p.join(" ");
  }
  function genericOf(category) {
    if (category === "serif") return "serif";
    if (category === "monospace") return "monospace";
    if (category === "handwriting") return "cursive";
    return "sans-serif";
  }
  // sinnvolle Gewichte herausfiltern (300–800); leere Liste → erstes verfügbares
  function weightsOf(arr) {
    if (!arr || !arr.length) return "400,700";
    var keep = [], want = [300, 400, 500, 600, 700, 800];
    for (var i = 0; i < arr.length; i++) if (want.indexOf(arr[i]) >= 0) keep.push(arr[i]);
    if (!keep.length) keep = [arr[0]];
    return keep.join(",");
  }
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
        window.KIT_BUNNY[k] = { s: k, n: f.familyName || titleCase(k), g: genericOf(f.category), w: weightsOf(f.weights), c: f.category || "" };
        window.KIT_BUNNY_LIST.push(window.KIT_BUNNY[k]);
      }
      window.KIT_BUNNY_LIST.sort(function (a, b) { var x = a.n.toLowerCase(), y = b.n.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; });
      bunnyState = 2;
      done();
    }).catch(function () { bunnyState = 0; done(); });
  }
  // Suchpool: Favoriten zuerst, dann der restliche Katalog (max. 60 Treffer)
  function fontPool() {
    var seen = {}, out = [];
    for (var i = 0; i < window.KIT_FONTS.length; i++) { out.push(window.KIT_FONTS[i]); seen[window.KIT_FONTS[i].s] = 1; }
    for (var j = 0; j < window.KIT_BUNNY_LIST.length; j++) if (!seen[window.KIT_BUNNY_LIST[j].s]) out.push(window.KIT_BUNNY_LIST[j]);
    return out;
  }
  function fontMatch(q) {
    q = (q || "").toLowerCase();
    var pool = fontPool(), res = [];
    for (var i = 0; i < pool.length && res.length < 60; i++) {
      var f = pool[i];
      if (!q || f.n.toLowerCase().indexOf(q) >= 0 || f.s.indexOf(q) >= 0) res.push(f);
    }
    return res;
  }
  // Anzeigename der aktuell gespeicherten Schrift (JSON-Deskriptor oder Legacy-Slug)
  function curName(role) {
    var v = gs(role === "head" ? "kitFontHead" : "kitFontBody", role === "head" ? window.KIT_DEFAULT_HEAD : window.KIT_DEFAULT_BODY);
    if (v && v.charAt(0) === "{") { try { var o = JSON.parse(v); if (o && o.n) return o.n; } catch (e) {} }
    for (var i = 0; i < window.KIT_FONTS.length; i++) if (window.KIT_FONTS[i].s === v) return window.KIT_FONTS[i].n;
    if (window.KIT_BUNNY && window.KIT_BUNNY[v]) return window.KIT_BUNNY[v].n;
    return titleCase(v);
  }

  var pairSel = document.getElementById("pair-picker");

  function setupFontBox(role, inputId, popupId) {
    var inp = document.getElementById(inputId), pop = document.getElementById(popupId);
    if (!inp || !pop) return;
    inp.value = curName(role);
    function render(q) {
      var res = fontMatch(q);
      pop.innerHTML = "";
      for (var i = 0; i < res.length; i++) {
        (function (f) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "cz-font-opt";
          var nm = document.createElement("span"); nm.textContent = f.n;
          var ct = document.createElement("em"); ct.textContent = f.c || f.g || "";
          b.appendChild(nm); b.appendChild(ct);
          // mousedown statt click: feuert vor dem blur des Inputs (Popup bleibt benutzbar)
          b.addEventListener("mousedown", function (e) {
            e.preventDefault();
            window.kitApplyFont(role, f, true);
            inp.value = f.n;
            pop.classList.remove("open");
            if (pairSel) pairSel.value = "";
            clearLook();
          });
          pop.appendChild(b);
        })(res[i]);
      }
      pop.classList.toggle("open", res.length > 0);
    }
    inp.addEventListener("focus", function () {
      inp.select();
      render("");
      loadBunny(function () { if (document.activeElement === inp) render(inp.value && inp.value !== curName(role) ? inp.value : ""); });
    });
    inp.addEventListener("input", function () { render(inp.value); });
    inp.addEventListener("blur", function () { setTimeout(function () { pop.classList.remove("open"); }, 170); });
  }
  setupFontBox("head", "cz-fh-in", "cz-fh-pop");
  setupFontBox("body", "cz-fb-in", "cz-fb-pop");

  // Schrift-Paare (Vorlagen)
  if (pairSel && window.KIT_PAIRS) {
    for (var pi = 0; pi < window.KIT_PAIRS.length; pi++) {
      var pp = window.KIT_PAIRS[pi];
      var po = document.createElement("option");
      po.value = pi; po.textContent = pp.n;
      pairSel.appendChild(po);
    }
    pairSel.addEventListener("change", function () {
      var pr = window.KIT_PAIRS[parseInt(pairSel.value, 10)];
      if (!pr) return;
      window.kitApplyFont("head", pr.h, true);
      window.kitApplyFont("body", pr.b, true);
      var fh = document.getElementById("cz-fh-in"); if (fh) fh.value = curName("head");
      var fb = document.getElementById("cz-fb-in"); if (fb) fb.value = curName("body");
      clearLook();
    });
  }

  // „Feinschliff" auf-/zuklappen
  var moreBtn = document.getElementById("cz-type-more"), moreBody = document.getElementById("cz-type-adv");
  if (moreBtn && moreBody) moreBtn.addEventListener("click", function () {
    var open = moreBody.classList.toggle("open");
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* ---------------------------------------------------------------- Farben + Kontrast-Wächter */
  var colorMap = { "cz-c-brand": "--color-brand", "cz-c-accent": "--color-accent", "cz-c-bg": "--color-bg" };
  function cssVar(name) { return getComputedStyle(D).getPropertyValue(name).trim(); }
  function checkWarn() {
    var w = document.getElementById("cz-warn");
    if (!w || !window.KIT_RATIO) return;
    var r = window.KIT_RATIO(cssVar("--color-brand") || "#000000", cssVar("--color-bg") || "#ffffff");
    w.classList.toggle("show", r < 2.6);
  }
  function syncColors() {
    for (var id in colorMap) {
      var el = document.getElementById(id);
      if (el) { var h = cssVar(colorMap[id]); if (h.charAt(0) === "#" && h.length === 7) el.value = h; }
    }
    checkWarn();
  }
  var pal = document.getElementById("cz-pal");
  function markPal() {
    var sv = gs("kitPalette", null);
    if (pal) [].forEach.call(pal.children, function (x, i) { x.classList.toggle("on", String(i) === sv); });
  }
  // Schema-Swatches: zweifarbig (Akzent + tatsächlicher Hintergrund), dunkle Schemas markiert
  if (pal && window.KIT_PALETTES) {
    for (var qi = 0; qi < window.KIT_PALETTES.length; qi++) {
      (function (idx) {
        var p = window.KIT_PALETTES[idx];
        var b = document.createElement("button");
        b.title = p.n + ((window.KIT_RL && window.KIT_RL(p.v["--color-bg"] || "#FFFFFF") < 0.42) ? " (dunkel)" : "");
        var brand = p.v["--color-brand"], bg = p.v["--color-bg"] || "#FFFFFF";
        b.style.background = "linear-gradient(135deg, " + brand + " 0 50%, " + bg + " 50% 100%)";
        b.addEventListener("click", function () { window.kitPalette(idx, true); markPal(); syncColors(); clearLook(); });
        pal.appendChild(b);
      })(qi);
    }
  }
  for (var cid in colorMap) {
    (function (elId, varName) {
      var el = document.getElementById(elId);
      if (el) el.addEventListener("input", function () { window.kitColor(varName, el.value, true); checkWarn(); clearLook(); });
    })(cid, colorMap[cid]);
  }

  /* ---------------------------------------------------------------- Generische Segmente */
  // data-fn wählt die Setter-Familie, data-kind den Regler, data-v den Wert.
  var DEFAULTS = {
    layout: { cols: "3", width: "standard", dens: "komfortabel", corner: "eckig", hero: "split", nav: "standard" },
    type:   { size: "standard", lead: "normal", track: "normal", case: "normal", align: "links" },
    card:   { style: "classic", aspect: "16:9", surface: "flat", image: "farbe" },
    struct: { shell: "single", auf: "klein", stream: "liste", header: "links", search: "0" },
  };
  var STORE_KEYS = { layout: "kitLayout", type: "kitType", card: "kitCard", struct: "kitStruct" };
  function currentValue(fn, kind) {
    if (fn === "base") return gs("kitBase", "light");
    var o = jget(STORE_KEYS[fn]);
    return (o[kind] != null) ? o[kind] : DEFAULTS[fn][kind];
  }
  function applyValue(fn, kind, val) {
    if (fn === "layout") window.kitSetLayout(kind, val, true);
    else if (fn === "type") window.kitType(kind, val, true);
    else if (fn === "card") window.kitCard(kind, val, true);
    else if (fn === "base") window.kitBase(val, true);
    else if (fn === "struct") { var o = {}; o[kind] = val; window.kitStructSet(o, true); } // → Reload
  }
  function markSeg(seg) {
    var fn = seg.getAttribute("data-fn"), kind = seg.getAttribute("data-kind") || "mode";
    var cur = currentValue(fn, kind);
    [].forEach.call(seg.children, function (b) { b.classList.toggle("on", b.getAttribute("data-v") === String(cur)); });
  }
  [].forEach.call(document.querySelectorAll(".cz-seg"), function (seg) {
    var fn = seg.getAttribute("data-fn"), kind = seg.getAttribute("data-kind") || "mode";
    markSeg(seg);
    [].forEach.call(seg.children, function (b) {
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
    var st0 = jget("kitStruct"), shell0 = st0.shell || "single";
    var rails0 = st0.rails || (shell0 === "portal" ? ["neueste", "meist", "themen"] : []);
    railsEl.classList.toggle("cz-rails--off", shell0 !== "portal");
    [].forEach.call(railsEl.children, function (b) {
      var rail = b.getAttribute("data-rail");
      if (rails0.indexOf(rail) >= 0) b.classList.add("on");
      b.addEventListener("click", function () {
        var s = jget("kitStruct");
        var cur = s.rails || (((s.shell || "single") === "portal") ? ["neueste", "meist", "themen"] : []);
        var i = cur.indexOf(rail);
        if (i >= 0) cur.splice(i, 1); else cur.push(rail);
        window.kitStructSet({ rails: cur }, true); // → Reload
      });
    });
  }

  /* ---------------------------------------------------------------- Header: Titel + Navigation */
  var navEd = document.getElementById("cz-nav"), brandInp = document.getElementById("cz-brand");
  if (navEd) {
    var savedChrome = {};
    try { savedChrome = JSON.parse(localStorage.getItem("kitChrome") || "{}"); } catch (e) {}
    if (brandInp) brandInp.value = savedChrome.brand || window.KIT_DEFAULT_BRAND || "";

    // Initiale Liste: gespeichert > aktuelle Seiten-Nav (DOM) > Default
    var navInit = savedChrome.nav;
    if (!navInit) {
      var dom = document.querySelectorAll(".tabs__inner .tab");
      if (dom.length) navInit = [].map.call(dom, function (a) { return { l: a.textContent.trim(), h: a.getAttribute("href"), x: a.target === "_blank" }; });
    }
    if (!navInit) navInit = window.KIT_DEFAULT_NAV || [];

    function moveRow(row, dir) {
      var sib = dir < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (!sib) return;
      if (dir < 0) navEd.insertBefore(row, sib); else navEd.insertBefore(sib, row);
    }
    // Eine editierbare Nav-Zeile: Grip (Drag + Pfeiltasten) | Label | URL | Entfernen
    function navRow(n) {
      var row = document.createElement("div"); row.className = "cz-nav-row";
      var grip = document.createElement("button");
      grip.type = "button"; grip.className = "cz-nav-grip"; grip.textContent = "⠿";
      grip.title = "Ziehen oder Pfeiltasten zum Sortieren"; grip.setAttribute("aria-label", "Link verschieben");
      var label = document.createElement("input"); label.className = "cz-nav-l"; label.placeholder = "Label"; label.value = (n && n.l) || "";
      var href = document.createElement("input"); href.className = "cz-nav-h"; href.placeholder = "URL"; href.value = (n && n.h) || "";
      var del = document.createElement("button"); del.type = "button"; del.className = "cz-nav-x"; del.textContent = "×"; del.title = "Entfernen";
      del.addEventListener("click", function () { if (row.parentNode) row.parentNode.removeChild(row); });
      grip.addEventListener("keydown", function (e) {
        if (e.key === "ArrowUp") { e.preventDefault(); moveRow(row, -1); grip.focus(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); moveRow(row, 1); grip.focus(); }
      });
      grip.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        row.classList.add("cz-nav-row--drag");
        var move = function (ev) {
          var rows = [].slice.call(navEd.querySelectorAll(".cz-nav-row")), after = null;
          for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (r === row) continue;
            var b = r.getBoundingClientRect();
            if (ev.clientY < b.top + b.height / 2) { after = r; break; }
          }
          if (after) navEd.insertBefore(row, after); else navEd.appendChild(row);
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
      navEd.appendChild(row);
    }
    navInit.forEach(navRow);

    var addBtn = document.getElementById("cz-nav-add");
    if (addBtn) addBtn.addEventListener("click", function () { navRow({ l: "", h: "" }); });

    var applyBtn = document.getElementById("cz-chrome-apply");
    if (applyBtn) applyBtn.addEventListener("click", function () {
      var out = [];
      [].forEach.call(navEd.querySelectorAll(".cz-nav-row"), function (r) {
        var l = r.querySelector(".cz-nav-l").value.trim(), h = r.querySelector(".cz-nav-h").value.trim();
        if (l) out.push({ l: l, h: h || "#", x: (h.indexOf("http") === 0 && h.indexOf(location.host) < 0) });
      });
      window.kitChromeSet({ brand: (brandInp ? brandInp.value.trim() : ""), nav: out }); // → Reload
    });
  }

  /* ---------------------------------------------------------------- Suche (feed-basiert, /api/search) */
  var searchBtn = document.querySelector(".tabs__search");
  var searchDlg = document.getElementById("kit-search");
  if (searchBtn && searchDlg) {
    var sIn = document.getElementById("kit-search-in");
    var sRes = document.getElementById("kit-search-res");
    var sTimer = null, sActive = -1;

    function openSearch() {
      if (typeof searchDlg.showModal === "function") searchDlg.showModal();
      else searchDlg.setAttribute("open", "");
      sIn.value = ""; sRes.innerHTML = ""; sActive = -1;
      sIn.focus();
    }
    function closeSearch() {
      if (typeof searchDlg.close === "function") searchDlg.close();
      else searchDlg.removeAttribute("open");
    }
    function markActive(links) {
      for (var i = 0; i < links.length; i++) links[i].classList.toggle("is-active", i === sActive);
      if (links[sActive]) links[sActive].scrollIntoView({ block: "nearest" });
    }
    function renderResults(results, query) {
      sRes.innerHTML = ""; sActive = -1;
      if (!results.length) {
        if (query) { var p = document.createElement("p"); p.className = "kit-search__empty"; p.textContent = "Keine Treffer für „" + query + "“."; sRes.appendChild(p); }
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
    searchBtn.addEventListener("click", openSearch);
    searchBtn.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSearch(); } });
    document.getElementById("kit-search-close").addEventListener("click", closeSearch);
    // Klick auf den Backdrop (= das dialog-Element selbst) schließt
    searchDlg.addEventListener("click", function (e) { if (e.target === searchDlg) closeSearch(); });
    sIn.addEventListener("input", function () { clearTimeout(sTimer); sTimer = setTimeout(runSearch, 180); });
    sIn.addEventListener("keydown", function (e) {
      var links = sRes.querySelectorAll(".kit-search__a");
      if (e.key === "ArrowDown") { e.preventDefault(); if (links.length) { sActive = Math.min(sActive + 1, links.length - 1); markActive(links); } }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (links.length) { sActive = Math.max(sActive - 1, 0); markActive(links); } }
      else if (e.key === "Enter") { var pick = links[sActive >= 0 ? sActive : 0]; if (pick) { e.preventDefault(); location.href = pick.href; } }
    });
  }

  /* ---------------------------------------------------------------- Admin-Code (globales Schreiben) */
  // Der Code wird einmal abgefragt und im Browser gemerkt; der Server prüft jede Anfrage
  // gegen das Secret KIT_ADMIN_CODE (401 → gemerkten Code verwerfen).
  function kitAdminCode() {
    var c = null;
    try { c = localStorage.getItem("kitAdmin"); } catch (e) {}
    if (!c) {
      c = window.prompt("Admin-Code für globale Änderungen:");
      if (c) { c = c.trim(); try { localStorage.setItem("kitAdmin", c); } catch (e) {} }
    }
    return c;
  }
  function kitAdminFail() {
    try { localStorage.removeItem("kitAdmin"); } catch (e) {}
    alert("Admin-Code falsch oder fehlt.");
  }

  /* ---------------------------------------------------------------- Logo (global, KV) */
  var logoFile = document.getElementById("cz-logo-file");
  if (logoFile) logoFile.addEventListener("change", function () {
    var f = logoFile.files && logoFile.files[0];
    if (!f) return;
    if (f.size > 1572864) { alert("Logo zu groß (max. 1,5 MB)."); logoFile.value = ""; return; }
    var code = kitAdminCode();
    logoFile.value = "";
    if (!code) return;
    function send(aspect) {
      fetch("/api/logo", {
        method: "PUT",
        headers: { "x-kit-admin": code, "x-kit-type": f.type || "image/png", "x-kit-aspect": String(aspect || 4) },
        body: f,
      }).then(function (r) {
        if (r.status === 401) { kitAdminFail(); return; }
        if (!r.ok) { alert("Logo-Upload fehlgeschlagen."); return; }
        location.reload();
      }).catch(function () { alert("Logo-Upload fehlgeschlagen."); });
    }
    // Seitenverhältnis fürs Server-Meta ermitteln (Fallback 4:1)
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () { var a = im.naturalWidth / (im.naturalHeight || 1); URL.revokeObjectURL(url); send(a); };
    im.onerror = function () { URL.revokeObjectURL(url); send(4); };
    im.src = url;
  });
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
    if (looksEl) [].forEach.call(looksEl.children, function (x, i) { x.classList.toggle("on", String(i) === sv); });
  }
  if (looksEl && window.KIT_LOOKS) {
    for (var lo = 0; lo < window.KIT_LOOKS.length; lo++) {
      (function (idx) {
        var L = window.KIT_LOOKS[idx];
        var b = document.createElement("button");
        b.className = "cz-look";
        var bb = document.createElement("b"); bb.textContent = L.n;
        var sp = document.createElement("span"); sp.textContent = L.d || "";
        b.appendChild(bb); b.appendChild(sp);
        b.addEventListener("click", function () { window.kitLook(idx, true); syncAll(); });
        looksEl.appendChild(b);
      })(lo);
    }
  }

  // Panel-UI an den aktuellen Zustand angleichen (nach Look-Klick / Basis-Wechsel)
  function syncAll() {
    var fh = document.getElementById("cz-fh-in"); if (fh) fh.value = curName("head");
    var fb = document.getElementById("cz-fb-in"); if (fb) fb.value = curName("body");
    if (pairSel) pairSel.value = "";
    [].forEach.call(document.querySelectorAll(".cz-seg"), markSeg);
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
  var pubBtn = document.getElementById("cz-pub");
  if (pubBtn) pubBtn.addEventListener("click", function () {
    var code = kitAdminCode();
    if (!code) return;
    var SKIN_KEYS = ["kitFontHead", "kitFontBody", "kitColors", "kitLayout", "kitType", "kitCard", "kitPalette", "kitBase", "kitLook"];
    var skin = {};
    for (var i = 0; i < SKIN_KEYS.length; i++) {
      try { var v = localStorage.getItem(SKIN_KEYS[i]); if (v != null) skin[SKIN_KEYS[i]] = v; } catch (e) {}
    }
    function cookieValue(name) {
      var parts = document.cookie.split("; ");
      for (var j = 0; j < parts.length; j++) if (parts[j].indexOf(name + "=") === 0) return parts[j].slice(name.length + 1);
      return "";
    }
    var payload = { skin: skin, kitstruct: cookieValue("kitstruct"), kitchrome: cookieValue("kitchrome") };
    var orig = pubBtn.textContent;
    pubBtn.disabled = true;
    pubBtn.textContent = "Speichert …";
    fetch("/api/config", {
      method: "PUT",
      headers: { "x-kit-admin": code, "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) {
      pubBtn.disabled = false;
      if (r.status === 401) { pubBtn.textContent = orig; kitAdminFail(); return; }
      if (!r.ok) { pubBtn.textContent = orig; alert("Speichern fehlgeschlagen."); return; }
      pubBtn.textContent = "✓ Für alle gespeichert";
      setTimeout(function () { pubBtn.textContent = orig; }, 2200);
    }).catch(function () { pubBtn.disabled = false; pubBtn.textContent = orig; alert("Speichern fehlgeschlagen."); });
  });

  /* ---------------------------------------------------------------- Publish-Status + Revert */
  // „Zuletzt veröffentlicht"-Anzeige + Rücksprung zur Vorversion (PATCH /api/config).
  var pubTs = document.getElementById("cz-pub-ts");
  var pubUndo = document.getElementById("cz-pub-undo");
  function refreshPubMeta() {
    if (!pubTs) return;
    fetch("/api/config").then(function (r) { return r.json(); }).then(function (j) {
      pubTs.textContent = (j && j.ts)
        ? "Stand: " + new Date(j.ts).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Noch nichts veröffentlicht";
    }).catch(function () { pubTs.textContent = "–"; });
  }
  refreshPubMeta();
  if (pubUndo) pubUndo.addEventListener("click", function () {
    var code = kitAdminCode();
    if (!code) return;
    pubUndo.disabled = true;
    fetch("/api/config", { method: "PATCH", headers: { "x-kit-admin": code } }).then(function (r) {
      pubUndo.disabled = false;
      if (r.status === 401) { kitAdminFail(); return; }
      if (r.status === 404) { alert("Keine Vorversion vorhanden."); return; }
      if (!r.ok) { alert("Zurücknehmen fehlgeschlagen."); return; }
      location.reload(); // Vorversion ist jetzt aktiv
    }).catch(function () { pubUndo.disabled = false; });
  });

  /* ---------------------------------------------------------------- Post-Reaktionen */
  // Clap: KV-Zähler über /api/react (optimistisches UI); Teilen: Web Share API → Clipboard-Fallback.
  var clapBtn = document.getElementById("js-clap");
  if (clapBtn) {
    var clapN = document.getElementById("js-clap-n");
    var clapBusy = false;
    clapBtn.addEventListener("click", function () {
      if (clapBusy) return;
      clapBusy = true;
      setTimeout(function () { clapBusy = false; }, 400); // Mehrfach-Klicks drosseln
      if (clapN) clapN.textContent = String((parseInt(clapN.textContent, 10) || 0) + 1);
      fetch("/api/react?g=" + encodeURIComponent(clapBtn.getAttribute("data-guid")), { method: "POST" })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (clapN && j && typeof j.n === "number") clapN.textContent = String(j.n); })
        .catch(function () {});
    });
  }
  var shareBtn = document.getElementById("js-share");
  if (shareBtn) shareBtn.addEventListener("click", function () {
    var title = shareBtn.getAttribute("data-title") || document.title;
    var url = location.href;
    var label = document.getElementById("js-share-t");
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        if (label) { label.textContent = "Link kopiert ✓"; setTimeout(function () { label.textContent = "Teilen"; }, 1800); }
      }).catch(function () {});
    }
  });

  /* ---------------------------------------------------------------- „Mehr laden" */
  // Holt die nächste Server-Seite (?page=N) und hängt nur deren Teaser-Karten ans Grid.
  var loadMoreBtn = document.getElementById("js-loadmore");
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", function () {
    var next = parseInt(loadMoreBtn.getAttribute("data-next"), 10);
    var pages = parseInt(loadMoreBtn.getAttribute("data-pages"), 10);
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Lädt …";
    var base = loadMoreBtn.getAttribute("data-url") || "/";
    var sep = base.indexOf("?") >= 0 ? "&" : "?";
    fetch(base + sep + "page=" + next).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var grid = document.querySelector(".grid");
      doc.querySelectorAll(".grid .card").forEach(function (c) { grid.appendChild(document.importNode(c, true)); });
      next++;
      loadMoreBtn.setAttribute("data-next", next);
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = "Mehr laden";
      if (next > pages) loadMoreBtn.style.display = "none";
    }).catch(function () { loadMoreBtn.disabled = false; loadMoreBtn.textContent = "Mehr laden"; });
  });
})();
