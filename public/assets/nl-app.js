/* nl-app.js — Steady Newsletter customizer (merged into the page kit).
 * Reuses the kit's .cz panel chrome (kit.css) with newsletter controls, and wraps
 * the email previews in a stylized desktop mail-client window + a phone. */
(function () {
  "use strict";
  var FIXTURE_URL = "/assets/nl-fixture.html";
  var STORE = "nlkit";
  var state = Object.assign({}, NL.DEFAULTS, { view: "designed", device: "mobile", dark: false, lang: "en" });
  var raw = null;

  function t(k, vars) {
    var s = (NL.I18N[state.lang] || NL.I18N.en)[k];
    if (s == null) s = NL.I18N.en[k] || k;
    if (vars) for (var v in vars) s = s.replace("{" + v + "}", vars[v]);
    return s;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
  function load() { try { var s = JSON.parse(localStorage.getItem(STORE)); if (s) Object.assign(state, s); } catch (e) {} }
  function byId(id) { return document.getElementById(id); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) { if (k === "class") e.className = attrs[k]; else if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }

  /* ---- Fontshare loader (for picker previews) ---- */
  var loadedFonts = {};
  function loadFontCss(f) {
    if (!f || !f.fontshare || loadedFonts[f.s]) return;
    loadedFonts[f.s] = 1;
    var l = h("link", { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=" + f.fontshare + "@400,500,700&display=swap" });
    document.head.appendChild(l);
  }

  /* ---- control renderers (kit .cz-* markup) ---- */
  function lbl(c) { return h("label", { class: "cz-lbl" }, [t(c.label), c.sub ? h("span", { class: "cz-lbl-x" }, [" " + t(c.sub)]) : null]); }
  function colorCtl(c) {
    var inp = h("input", { type: "color", value: state[c.key] });
    var em = h("em", {}, [c.sub ? t(c.sub) : state[c.key]]);
    inp.addEventListener("input", function () { state[c.key] = inp.value; if (!c.sub) em.textContent = inp.value; update(); });
    return h("label", { class: "cz-color" }, [inp, h("span", { class: "cz-color-t" }, [t(c.label), em])]);
  }
  function checkCtl(c) {
    var seg = h("div", { class: "cz-seg" });
    [["off", false], ["on", true]].forEach(function (o) {
      var b = h("button", { type: "button" }, [t(o[0])]);
      if (!!state[c.key] === o[1]) b.className = "on";
      b.addEventListener("click", function () {
        state[c.key] = o[1];
        seg.querySelectorAll("button").forEach(function (x, i) { x.classList.toggle("on", i === (o[1] ? 1 : 0)); });
        update();
      });
      seg.appendChild(b);
    });
    return h("div", {}, [lbl(c), seg]);
  }
  function segCtl(c) {
    var seg = h("div", { class: "cz-seg" });
    c.options.forEach(function (o) {
      var b = h("button", { type: "button" }, [t(o[1])]);
      if (state[c.key] === o[0]) b.className = "on";
      b.addEventListener("click", function () {
        state[c.key] = o[0];
        seg.querySelectorAll("button").forEach(function (x, i) { x.classList.toggle("on", c.options[i][0] === o[0]); });
        update();
      });
      seg.appendChild(b);
    });
    var out = [lbl(c), seg];
    if (c.fallbackNote) out.push(h("p", { class: "cz-hint nl-warn" }, ["⚠ " + t(c.fallbackNote)]));
    return h("div", {}, out);
  }
  function fontCtl(c) {
    var role = c.role || "body";
    var previewWeight = role === "head" ? "700" : "400";
    var box = h("div", { class: "cz-font" });
    var inp = h("input", { class: "cz-font-in", type: "text", autocomplete: "off", spellcheck: "false", placeholder: t("searchFonts") });
    var pop = h("div", { class: "cz-font-pop" });
    var hint = h("p", {});
    function curFont() { return NL.fontById(state[c.key]); }
    function upHint() {
      var f = curFont();
      hint.textContent = f.group === "web" ? "⚠ " + t("fallsback", { f: f.fallback }) : "✓ " + t("renders");
      hint.className = "cz-hint " + (f.group === "web" ? "nl-warn" : "nl-ok");
    }
    inp.value = curFont().n; upHint(); loadFontCss(curFont());
    var io = null;
    function render(q) {
      q = (q || "").toLowerCase();
      pop.innerHTML = ""; if (io) io.disconnect();
      var map = new Map(), n = 0;
      for (var i = 0; i < NL.FONTS.length && n < 60; i++) {
        var f = NL.FONTS[i];
        if (!NL.roleOk(f, role)) continue;
        if (q && f.n.toLowerCase().indexOf(q) < 0 && f.s.indexOf(q) < 0) continue;
        n++;
        (function (f) {
          var b = h("button", { type: "button", class: "cz-font-opt" });
          var nm = h("span", {}, [f.n]);
          nm.style.fontFamily = '"' + f.n + '", ' + (f.g || "sans-serif"); nm.style.fontWeight = previewWeight;
          b.appendChild(nm); b.appendChild(h("em", {}, [f.c]));
          b.addEventListener("mousedown", function (e) {
            e.preventDefault();
            state[c.key] = f.id; inp.value = f.n; upHint(); pop.classList.remove("open"); update();
          });
          pop.appendChild(b); map.set(b, f);
        })(f);
      }
      pop.classList.toggle("open", pop.children.length > 0);
      if (typeof IntersectionObserver === "function") {
        io = new IntersectionObserver(function (es) {
          es.forEach(function (en) { if (!en.isIntersecting) return; var f = map.get(en.target); if (f) { loadFontCss(f); io.unobserve(en.target); } });
        }, { root: pop });
        pop.querySelectorAll(".cz-font-opt").forEach(function (b) { io.observe(b); });
      } else { map.forEach(function (f) { loadFontCss(f); }); }
    }
    inp.addEventListener("focus", function () { inp.select(); render(""); });
    inp.addEventListener("input", function () { render(inp.value); });
    inp.addEventListener("blur", function () { setTimeout(function () { pop.classList.remove("open"); }, 170); });
    box.appendChild(inp); box.appendChild(pop);
    return h("div", {}, [lbl(c), box, hint]);
  }
  function looksCtl() {
    var grid = h("div", { class: "cz-looks" });
    NL.LOOKS.forEach(function (l) {
      var b = h("button", { type: "button", class: "cz-look", title: l.d }, [h("b", {}, [l.label]), h("span", {}, [l.d])]);
      b.addEventListener("click", function () { applyLook(l); });
      grid.appendChild(b);
    });
    return grid;
  }
  var RENDERERS = { color: colorCtl, check: checkCtl, seg: segCtl, font: fontCtl };

  function section(titleKey, controls, open) {
    var sh = h("button", { type: "button", class: "cz-sh" }, [t(titleKey), h("span", { class: "cz-cv" }, ["▾"])]);
    var sb = h("div", { class: "cz-sb" }, controls);
    var sec = h("section", { class: "cz-sec" + (open ? " cz-open" : "") }, [sh, sb]);
    sh.addEventListener("click", function () { sec.classList.toggle("cz-open"); });
    return sec;
  }
  function buildPanel() {
    var body = byId("nl-controls");
    body.innerHTML = "";
    NL.CONTROLS.forEach(function (sec, i) {
      body.appendChild(section(sec.title, sec.rows.map(function (c) { return RENDERERS[c.type](c); }), i === 0));
    });
    body.appendChild(section("looks", [looksCtl()], false));
    body.appendChild(h("div", { id: "nl-warnings" }));
  }

  /* ---- email-client chrome ---- */
  var SUBJECT = "Does playing 3D chess make your child aggressive?";
  function frameFor(pane) {
    var f = h("iframe", { class: "nl-frame", "data-pane": pane, title: "Email preview" });
    f.addEventListener("load", function () { sizeFrame(f); });
    return f;
  }
  function listRow(on, sender, time, subj, snip) {
    return h("div", { class: "list-row" + (on ? " on" : "") }, [
      h("div", { class: "lr-top" }, [h("b", {}, [sender]), h("span", {}, [time])]),
      h("div", { class: "lr-sub" }, [subj]),
      h("div", { class: "lr-snip" }, [snip]),
    ]);
  }
  function readHead() {
    return h("div", { class: "read-head" }, [
      h("span", { class: "av big" }, ["Q"]),
      h("div", { class: "rh-meta" }, [
        h("div", { class: "rh-from" }, [h("b", {}, ["Quadrant A"]), " <hello@quadrant-a.com>"]),
        h("div", { class: "rh-sub" }, [SUBJECT]),
        h("div", { class: "rh-to" }, ["To: you · Today, 09:24"]),
      ]),
    ]);
  }
  function mailwin(pane) {
    return h("div", { class: "mailwin" }, [
      h("div", { class: "mailwin-bar" }, [h("span", { class: "dots" }, [h("i"), h("i"), h("i")]), h("span", { class: "mw-title" }, ["Inbox"])]),
      h("div", { class: "mailwin-body" }, [
        h("div", { class: "mailwin-side" }, [
          h("div", { class: "side-new" }, ["New message"]),
          h("ul", { class: "side-folders" }, [h("li", { class: "on" }, ["Inbox"]), h("li", {}, ["Sent"]), h("li", {}, ["Drafts"]), h("li", {}, ["Archive"])]),
          h("div", { class: "side-acct" }, [h("span", { class: "av" }, ["Q"]), h("span", {}, ["you@example.com"])]),
        ]),
        h("div", { class: "mailwin-list" }, [
          h("div", { class: "list-search" }, ["Search"]),
          listRow(true, "Quadrant A", "09:24", SUBJECT, "A new study from the Institute of Recreational Cognition…"),
          listRow(false, "The Weekly Bulletin", "Tue", "Five things we learned", "This week in review across the labs…"),
          listRow(false, "Field Notes", "Mon", "The octopus that forgot", "On memory, cephalopods and the limits…"),
          listRow(false, "Quadrant A", "Sun", "A short history of zero", "Where nothing became something…"),
        ]),
        h("div", { class: "mailwin-read" }, [readHead(), h("div", { class: "nl-screen" }, [frameFor(pane)])]),
      ]),
    ]);
  }
  function phone(pane) {
    return h("div", { class: "phone" }, [h("div", { class: "phone-inner" }, [
      h("div", { class: "phone-status" }, [h("span", { class: "ps-time" }, ["9:41"]), h("span", { class: "ps-notch" }), h("span", { class: "ps-ico" }, ["○ ▮"])]),
      h("div", { class: "phone-apphead" }, [h("span", { class: "ah-l" }, ["‹ Inbox"]), h("span", { class: "ah-r" }, ["↩ ⌫"])]),
      h("div", { class: "phone-msghead" }, [h("span", { class: "av" }, ["Q"]), h("div", { class: "pmh-meta" }, [
        h("div", { class: "pmh-from" }, [h("b", {}, ["Quadrant A"]), h("span", {}, ["09:24"])]),
        h("div", { class: "pmh-sub" }, [SUBJECT]),
      ])]),
      h("div", { class: "nl-screen" }, [frameFor(pane)]),
    ])]);
  }
  function buildPreviews() {
    var root = byId("nl-previews");
    root.innerHTML = "";
    ["designed", "fallback"].forEach(function (pane) {
      var cap = h("div", { class: "nl-caption" }, [
        h("span", { class: "dot " + (pane === "designed" ? "ok" : "warn") }),
        h("span", {}, [t(pane === "designed" ? "whatYouDesign" : "whatMost")]),
        h("em", {}, [pane === "designed" ? "Apple Mail · ~25%" : "Gmail / Outlook · ~75%"]),
      ]);
      var chrome = state.device === "desktop" ? mailwin(pane) : phone(pane);
      root.appendChild(h("section", { class: "nl-station p-" + pane }, [cap, chrome]));
    });
  }

  /* ---- preview update + honesty cues ---- */
  function sizeFrame(frame) {
    try {
      frame.style.height = "auto";
      var d = frame.contentDocument;
      frame.style.height = (d && d.documentElement ? Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0) : 0) + "px";
    } catch (e) {}
  }
  function update() {
    if (raw != null) {
      var dh = NLCompiler.compile(raw, state, { target: "designed" });
      var fh = NLCompiler.compile(raw, state, { target: "fallback" });
      document.querySelectorAll('.nl-frame[data-pane="designed"]').forEach(function (fr) { fr.srcdoc = dh; });
      document.querySelectorAll('.nl-frame[data-pane="fallback"]').forEach(function (fr) { fr.srcdoc = fh; });
    }
    document.body.setAttribute("data-view", state.view);
    document.body.setAttribute("data-device", state.device);
    document.body.setAttribute("data-dark", state.dark ? "true" : "false");
    warnings(); save();
  }
  function warnings() {
    var box = byId("nl-warnings"); if (!box) return;
    box.innerHTML = "";
    var rText = NLCompiler.ratio(state.textColor, state.bgColor);
    if (rText < 4.5) box.appendChild(h("p", { class: "cz-warn show" }, ["⚠ " + t("contrastText", { r: rText.toFixed(1) })]));
    if (state.extendAccent) {
      var rLink = NLCompiler.ratio(state.accent, state.bgColor);
      if (rLink < 4.5) box.appendChild(h("p", { class: "cz-warn show" }, ["⚠ " + t("contrastLink", { r: rLink.toFixed(1) })]));
    }
  }

  function applyLook(l) { Object.assign(state, NL.DEFAULTS, l.set); buildPanel(); update(); }
  function reset() { Object.assign(state, NL.DEFAULTS); buildPanel(); update(); }
  function applyI18n() { document.querySelectorAll("[data-i18n]").forEach(function (e) { e.textContent = t(e.getAttribute("data-i18n")); }); }

  function segGroup(sel, attr, key, after) {
    document.querySelectorAll(sel + " [" + attr + "]").forEach(function (b) {
      b.addEventListener("click", function () {
        state[key] = b.getAttribute(attr);
        document.querySelectorAll(sel + " [" + attr + "]").forEach(function (x) { x.classList.toggle("on", x === b); });
        if (after) after();
        update();
      });
    });
  }

  function init() {
    load();
    buildPanel();
    buildPreviews();
    applyI18n();

    byId("nl-reset").addEventListener("click", reset);
    segGroup(".nl-tb-left", "data-view-btn", "view");
    segGroup("#device-seg", "data-device-btn", "device", buildPreviews);
    segGroup("#lang-seg", "data-lang-btn", "lang", function () { buildPanel(); buildPreviews(); applyI18n(); });
    byId("dark-toggle").addEventListener("click", function () {
      state.dark = !state.dark; byId("dark-toggle").classList.toggle("on", state.dark); update();
    });

    [["data-view-btn", "view"], ["data-device-btn", "device"], ["data-lang-btn", "lang"]].forEach(function (p) {
      document.querySelectorAll("[" + p[0] + "]").forEach(function (b) { b.classList.toggle("on", b.getAttribute(p[0]) === state[p[1]]); });
    });
    byId("dark-toggle").classList.toggle("on", state.dark);

    fetch(FIXTURE_URL).then(function (r) { return r.text(); }).then(function (txt) { raw = txt; update(); });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
