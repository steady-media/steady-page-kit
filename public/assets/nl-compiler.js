/* compiler.js — turn token choices into inlined, email-safe HTML.
 *
 * The page kit applies a skin live via CSS variables on <html>; email clients
 * ignore that. So we rewrite the token VALUES that originate from the MJML
 * <mj-attributes>/<mj-style> directly into the inlined HTML, never touching the
 * table structure or MSO conditionals. Two targets:
 *   designed  — webfonts load (what Apple Mail shows)
 *   fallback  — @font-face stripped + Outlook square buttons (what most inboxes show)
 */
(function (global) {
  "use strict";

  function hexToRgb(h) {
    h = (h || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function relLum(h) {
    var c = hexToRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) { var L1 = relLum(a), L2 = relLum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }
  function buttonFg(bg) { return relLum(bg) > 0.42 ? "#16121d" : "#ffffff"; }
  function enc(hex) { return hex.replace("#", "%23"); }

  function font(id) { var L = (global.NL && global.NL.FONTS) || []; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return L[0] || { stack: "serif" }; }

  var BODY_STACK = "Calluna,Georgia,Times New Roman,serif";
  var SANS = "font-family:CircularStd,Helvetica Neue,Helvetica,Arial,sans-serif;";

  function compile(raw, t, opts) {
    opts = opts || {};
    var fallback = opts.target === "fallback";
    var NLg = global.NL;

    var ink = t.textColor || "#291e38";
    var accent = t.accent || "#ff7264";
    var bg = t.bgColor || "#ffffff";
    var divider = t.dividerColor || "#e7e7e7";
    var bodyF = font(t.bodyFont || "calluna");
    var headF = font(t.headingFont || "circular");
    var size = NLg.SIZES[t.size] || "19px";
    var lead = NLg.LEADING[t.leading] || "147%";
    var hWeight = NLg.WEIGHT[t.headingWeight] || "700";
    var radius = fallback ? "0" : (NLg.RADIUS[t.corner] || "0"); // Outlook always squares
    var imgRadius = NLg.IMGRADIUS[t.imageCorner] || "0";
    var gap = NLg.DENSITY[t.density] || "30px";
    var link = NLg.LINK[t.linkStyle] || NLg.LINK.underline;
    var outline = t.buttonStyle === "outline";

    // ---- string-level swaps (global design tokens) ----
    var html = raw;
    html = html.split(BODY_STACK).join(bodyF.stack);
    html = html.split("font-size:19px").join("font-size:" + size);
    html = html.split("line-height:147%").join("line-height:" + lead);
    html = html.split("padding:0 0 30px 0").join("padding:0 0 " + gap + " 0");
    html = html.split("#e7e7e7").join(divider).split("#ebebf7").join(divider); // dividers
    html = html.split("#291e38").join(ink);                                    // ink
    if (link.deco === "none") html = html.split("text-decoration:underline!important").join("text-decoration:none!important");

    var doc = new DOMParser().parseFromString(html, "text/html");

    // ---- background ----
    if (doc.body) doc.body.style.backgroundColor = bg;
    var art = doc.querySelector('[aria-roledescription="email"]');
    if (art) art.style.backgroundColor = bg;

    // ---- heading font + weight ----
    doc.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(function (h) { h.style.fontFamily = headF.stack; h.style.fontWeight = hWeight; });

    // ---- accent: blockquote left border ----
    doc.querySelectorAll('.blockquote td[style*="border-left"]').forEach(function (td) {
      td.setAttribute("style", td.getAttribute("style").replace(/border-left:3px solid [^;]+/, "border-left:3px solid " + accent));
    });

    // ---- links (colour + style) ----
    var linkColor = t.extendAccent ? accent : ink;
    doc.querySelectorAll("style").forEach(function (st) {
      if (st.hasAttribute("data-kit-fonts")) return;
      var tx = st.textContent, ch = false;
      if (tx.indexOf("a{color:" + ink + "}") > -1) {
        tx = tx.replace("a{color:" + ink + "}", "a{color:" + linkColor + (link.weight ? ";font-weight:" + link.weight : "") + "}"); ch = true;
      }
      if (ch) st.textContent = tx;
    });

    // ---- button (fill/outline, colour, radius) ----
    var btnBg = t.extendAccent ? accent : ink;
    var btnFill = outline ? bg : btnBg;
    var btnText = outline ? btnBg : buttonFg(btnBg);
    var btnBorder = outline ? "2px solid " + btnBg : "none";
    doc.querySelectorAll("style").forEach(function (st) {
      if (st.hasAttribute("data-kit-fonts")) return;
      if (st.textContent.indexOf("color:#fff!important}") > -1) {
        st.textContent = st.textContent.replace(".button a{letter-spacing:1.7px!important;color:#fff!important}",
          ".button a{letter-spacing:1.7px!important;color:" + btnText + "!important}");
      }
    });
    doc.querySelectorAll(".button [bgcolor]").forEach(function (td) {
      td.setAttribute("bgcolor", btnFill);
      var s = td.getAttribute("style") || "";
      td.setAttribute("style", s.replace(/background:[^;]+/, "background:" + btnFill)
        .replace(/border:[^;]+/, "border:" + btnBorder).replace(/border-radius:[^;]+/, "border-radius:" + radius));
    });
    doc.querySelectorAll(".button a").forEach(function (a) {
      a.setAttribute("style", a.getAttribute("style").replace(/background:[^;]+/, "background:" + btnFill)
        .replace(/color:#fff/, "color:" + btnText).replace(/border-radius:[^;]+/, "border-radius:" + radius));
    });

    // ---- content image corners ----
    doc.querySelectorAll('img[width="568"]').forEach(function (img) { img.style.borderRadius = imgRadius; });

    // ---- header background + alignment ----
    var headTd = doc.querySelector('td[style*="padding:20px 0 50px"]');
    if (headTd) headTd.style.backgroundColor = bg === t.headerBg ? bg : (t.headerBg || bg);
    if (t.header === "center") centerHeader(doc);

    // ---- banner + membership + paywall blocks ----
    var ctb = doc.querySelector("td.blockquote");
    var bqRow = ctb && ctb.closest("tr");
    ctb = ctb && ctb.closest("tbody");
    if (ctb) {
      if (t.banner) ctb.insertAdjacentHTML("afterbegin", bannerRow(accent, ink, imgRadius));
      if (t.paywallTeaser && bqRow) bqRow.insertAdjacentHTML("afterend", paywallRow(accent, ink));
      if (t.memberCta) ctb.insertAdjacentHTML("beforeend", memberRow(accent, ink, bodyF.stack, radius));
    }

    // ---- webfonts: load chosen ones in designed; strip everything in fallback ----
    if (fallback) {
      var ff = doc.querySelector("style[data-kit-fonts]");
      if (ff) ff.parentNode.removeChild(ff);
    } else {
      [bodyF, headF].forEach(function (f) {
        if (!f.fontshare) return;
        var l = doc.createElement("link");
        l.rel = "stylesheet";
        l.href = "https://api.fontshare.com/v2/css?f[]=" + f.fontshare + "@400,500,700&display=swap";
        doc.head.appendChild(l);
      });
    }

    return "<!doctype html>" + doc.documentElement.outerHTML;
  }

  function centerHeader(doc) {
    var logoCell = doc.querySelector('td[width="55"]');
    if (!logoCell || !logoCell.parentNode) return;
    var row = logoCell.parentNode;
    var titleCell = logoCell.nextElementSibling;
    var img = logoCell.querySelector("img");
    var titleLink = titleCell ? titleCell.querySelector("a") : null;
    if (!img || !titleLink) return;
    titleCell.parentNode.removeChild(titleCell);
    logoCell.setAttribute("style", "text-align:center;padding-bottom:6px");
    logoCell.removeAttribute("width");
    logoCell.setAttribute("colspan", "2");
    logoCell.setAttribute("align", "center");
    img.setAttribute("style", "display:inline-block;width:44px;height:auto");
    var tr = doc.createElement("tr"), td = doc.createElement("td");
    td.setAttribute("colspan", "2"); td.setAttribute("align", "center");
    td.setAttribute("style", (titleCell.getAttribute("style") || "") + ";text-align:center");
    td.appendChild(titleLink); tr.appendChild(td);
    row.parentNode.insertBefore(tr, row.nextSibling);
  }

  function bannerRow(accent, ink, imgRadius) {
    var uri = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='568' height='180'%3E%3Cdefs%3E%3ClinearGradient id='b' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='" + enc(ink) + "'/%3E%3Cstop offset='1' stop-color='" + enc(accent) + "'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='568' height='180' fill='url(%23b)'/%3E%3Ctext x='32' y='106' font-family='Helvetica' font-size='32' font-weight='700' fill='%23fff'%3EQuadrant A%3C/text%3E%3C/svg%3E";
    return '<tr><td align="center" style="font-size:0;padding:0 0 26px 0;word-break:break-word"><img src="' + uri + '" alt="" width="568" style="display:block;width:100%;height:auto;border-radius:' + imgRadius + '"></td></tr>';
  }
  function paywallRow(accent, ink) {
    return '<tr><td align="center" style="font-size:0;padding:6px 0 14px;word-break:break-word"><div style="' + SANS + 'text-align:center;border-top:1px solid #ece9f1;padding-top:28px"><div style="font-size:15px;color:' + ink + ';font-weight:700">🔒 The rest of this story is for members</div><div style="font-size:14px;color:#9a95a6;padding:6px 0 14px;line-height:150%">Members get every issue in full, plus the archive.</div><a href="#" style="color:' + accent + ';font-weight:700;text-decoration:none">Become a member ›</a></div></td></tr>';
  }
  function memberRow(accent, ink, bodyStack, radius) {
    return '<tr><td align="center" style="font-size:0;padding:28px 0 10px 0;word-break:break-word"><table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ' + accent + ';border-radius:' + radius + '"><tr><td style="padding:26px 28px;text-align:center"><div style="font-family:' + bodyStack + ';font-size:20px;font-weight:700;color:' + ink + '">Enjoying Quadrant A?</div><div style="' + SANS + 'font-size:15px;color:#585266;line-height:155%;padding:8px 0 18px">Become a member to support independent science journalism — and unlock the full archive.</div><a href="#" style="display:inline-block;background:' + accent + ';color:' + buttonFg(accent) + ';' + SANS + 'font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:13px 24px;border-radius:' + radius + '">Become a member</a></td></tr></table></td></tr>';
  }

  global.NLCompiler = { compile: compile, ratio: ratio, buttonFg: buttonFg };
})(window);
