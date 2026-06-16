// kit-engage.js — hydratisiert .post__engage (nur steady-app-Modus).
// Holt /api/engagement?key=… und rendert Reaktionen + Kommentar-Thread read-only,
// plus „in der App"-CTA. Alle Nutzer-Inhalte via textContent (XSS-sicher).
// @ts-check
(function () {
  "use strict";
  var box = document.querySelector(".post__engage");
  if (!box) return;
  var key = box.getAttribute("data-engage-key") || "";
  var appUrl = box.getAttribute("data-engage-app") || "";
  if (!key) return;

  /** @param {string} tag @param {string=} cls @param {string=} text */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  /** @param {string} href @param {string} label */
  function cta(href, label) {
    var a = el("a", "engage__cta", label);
    a.setAttribute("href", href || appUrl || "#");
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
    return a;
  }
  /** @param {any} c @param {boolean} isReply */
  function comment(c, isReply) {
    var wrap = el("div", isReply ? "engage__c engage__c--reply" : "engage__c");
    var head = el("div", "engage__c-head");
    if (c.author && c.author.avatar) {
      var img = el("img", "engage__avatar"); img.setAttribute("src", c.author.avatar); img.setAttribute("alt", "");
      head.appendChild(img);
    }
    head.appendChild(el("span", "engage__name", (c.author && c.author.name) || ""));
    if (c.highlighted) head.appendChild(el("span", "engage__badge", box.getAttribute("data-l-hi") || "★"));
    wrap.appendChild(head);
    wrap.appendChild(el("p", "engage__text", c.text || ""));
    if (Array.isArray(c.replies)) c.replies.forEach(function (r) { wrap.appendChild(comment(r, true)); });
    return wrap;
  }

  fetch("/api/engagement?key=" + encodeURIComponent(key))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      box.textContent = "";
      if (!data || !data.configured || !data.hasCard) {
        box.appendChild(cta(appUrl, box.getAttribute("data-l-empty") || "")); return;
      }
      var meta = el("div", "engage__meta",
        (box.getAttribute("data-l-comments") || "{n}").replace("{n}", String(data.commentCount || 0)));
      box.appendChild(meta);
      (data.comments || []).forEach(function (c) { box.appendChild(comment(c, false)); });
      box.appendChild(cta(data.deepLink, box.getAttribute("data-l-cta") || ""));
    })
    .catch(function () { box.appendChild(cta(appUrl, box.getAttribute("data-l-cta") || "")); });
})();
