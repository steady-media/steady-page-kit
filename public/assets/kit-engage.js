// kit-engage.js — steady-app mode only.
// On a post page: hydrates .post__engage with the read-only comment thread + "open in app" CTA.
// On a list page (main[data-engage="1"]): lazy-loads comment counts for visible teasers.
// All user-generated content is rendered via textContent (XSS-safe).
// @ts-check
(function () {
  "use strict";

  /** @param {string} tag @param {string=} cls @param {string=} text */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Tchop's reaction types → matching emoji (shown like the app's reaction strip).
  var RX_EMOJI = { like: "👍", love: "❤️", haha: "😄", wow: "😮", sad: "😢", angry: "😠" };

  // --- Post page: full read-only comment thread --------------------------------------
  var box = document.querySelector(".post__engage");
  if (box) {
    var key = box.getAttribute("data-engage-key") || "";
    var appUrl = box.getAttribute("data-engage-app") || "";
    if (key) {
      /** @param {string} href @param {string} label */
      var cta = function (href, label) {
        var url = href || appUrl || "#";
        var safe = /^https?:\/\//i.test(url) ? url : "#";
        var a = el("a", "engage__cta", label);
        a.setAttribute("href", safe);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
        return a;
      };
      /** @param {any} c @param {boolean} isReply */
      var comment = function (c, isReply) {
        var wrap = el("div", isReply ? "engage__c engage__c--reply" : "engage__c");
        var head = el("div", "engage__c-head");
        if (c.author && c.author.avatar) {
          var img = el("img", "engage__avatar"); img.setAttribute("alt", "");
          img.onerror = function () { img.remove(); }; // missing image: show nothing rather than a broken icon
          img.setAttribute("src", c.author.avatar);
          head.appendChild(img);
        }
        head.appendChild(el("span", "engage__name", (c.author && c.author.name) || ""));
        if (c.highlighted) head.appendChild(el("span", "engage__badge", box.getAttribute("data-l-hi") || "★"));
        wrap.appendChild(head);
        wrap.appendChild(el("p", "engage__text", c.text || ""));
        if (!isReply && Array.isArray(c.replies)) c.replies.forEach(function (r) { wrap.appendChild(comment(r, true)); });
        return wrap;
      };
      fetch("/api/engagement?key=" + encodeURIComponent(key))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          box.textContent = "";
          if (!data || !data.configured || !data.hasCard) {
            box.appendChild(cta(appUrl, box.getAttribute("data-l-empty") || "")); return;
          }
          var oneTpl = box.getAttribute("data-l-comments-one") || "";
          var otherTpl = box.getAttribute("data-l-comments") || "{n}";
          var tpl = (data.commentCount === 1 && oneTpl) ? oneTpl : otherTpl;
          box.appendChild(el("div", "engage__meta", tpl.replace("{n}", String(data.commentCount || 0))));
          if (Array.isArray(data.reactionTypes) && data.reactionTypes.length) {
            var rxRow = el("div", "engage__reactions");
            // localized total as the accessible label; the emoji strip is the visual
            rxRow.setAttribute("aria-label", (box.getAttribute("data-l-reactions") || "{n}").replace("{n}", String(data.reactions || 0)));
            data.reactionTypes.forEach(function (rt) {
              rxRow.appendChild(el("span", "engage__rx", (RX_EMOJI[rt.name] || "•") + " " + rt.count));
            });
            box.appendChild(rxRow);
          }
          (data.comments || []).forEach(function (c) { box.appendChild(comment(c, false)); });
          box.appendChild(cta(data.deepLink, box.getAttribute("data-l-cta") || ""));
        })
        .catch(function () {
          box.textContent = "";
          box.appendChild(el("div", "engage__meta", box.getAttribute("data-l-err") || ""));
          box.appendChild(cta(appUrl, box.getAttribute("data-l-cta") || ""));
        });
    }
  }

  // --- List page: lazy comment counts on teasers -------------------------------------
  var main = document.querySelector('main[data-engage="1"]');
  if (main && "IntersectionObserver" in window) {
    var cOne = main.getAttribute("data-l-comments-one") || "{n}";
    var cOther = main.getAttribute("data-l-comments") || "{n}";
    /** @type {{[k: string]: number}} */
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var a = /** @type {Element} */ (entry.target);
        io.unobserve(a);
        var k = a.getAttribute("data-engage-key") || "";
        if (!k || seen[k]) return;
        seen[k] = 1;
        fetch("/api/engagement?counts=1&key=" + encodeURIComponent(k))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (!d || !d.configured || !d.hasCard) return;
            var c = d.commentCount || 0;
            if (c <= 0) return;                       // only show when there's a conversation
            var meta = a.querySelector(".card__date");
            if (!meta) return;
            var tpl = (c === 1 ? cOne : cOther);
            meta.appendChild(el("span", "card__engage", tpl.replace("{n}", String(c))));
          })
          .catch(function () {});
      });
    }, { rootMargin: "200px" });
    function observeTeasers() {
      var teasers = main.querySelectorAll("a[data-engage-key]");
      for (var i = 0; i < teasers.length; i++) io.observe(teasers[i]); // observe() is idempotent
    }
    observeTeasers();
    // "Mehr laden" appends more cards into .grid — pick those up too.
    if ("MutationObserver" in window) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            if (added[j].nodeType !== 1) continue;
            var node = /** @type {Element} */ (added[j]);
            if ((node.matches && node.matches("a[data-engage-key]")) ||
                (node.querySelector && node.querySelector("a[data-engage-key]"))) {
              observeTeasers();
              return;
            }
          }
        }
      }).observe(main, { childList: true, subtree: true });
    }
  }
})();
