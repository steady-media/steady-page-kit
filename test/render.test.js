// test/render.test.js — Volltext-Aufbereitung (Titel-Echo, Lede-Dedup, Paywall-Schnitt)
// + Smoke-Test, dass renderPost die SEO- und Paywall-Bausteine wirklich ausgibt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareFullText, renderPost, renderOnboarding } from "../functions/_lib/render.js";
import { STEADY_PUBLICATION_ID, SITE_ORIGIN } from "../functions/_lib/config.ts";

const FULL = `<h1>Mein Titel</h1><p>Die Lede aus dem Feed.</p><p>Öffentlicher Absatz.</p>
<hr aria-hidden="true"/><h2><mark style="background-color: rgb(230, 243, 251); color: inherit">Mitglieder-Bereich</mark><strong><mark style="background-color: rgb(230, 243, 251); color: inherit"> 🔒</mark></strong></h2><p>Geheimer Inhalt.</p>`;

test("prepareFullText: Titel-Echo + doppelte Lede entfernt, Marks gestrippt", () => {
  const out = prepareFullText(FULL, "Die Lede aus dem Feed.");
  assert.ok(!out.includes("<h1>"));
  assert.ok(!out.includes("Die Lede aus dem Feed."));
  assert.ok(!out.includes("<mark"));
  assert.ok(out.includes("Öffentlicher Absatz."));
});

test("prepareFullText: Steady-Paywall-Element steht VOR der Mitglieder-Überschrift", () => {
  const out = prepareFullText(FULL, "");
  const paywall = out.indexOf('id="steady_paywall"');
  const member = out.indexOf("Mitglieder-Bereich");
  assert.ok(paywall >= 0, "Paywall-Element fehlt");
  assert.ok(member > paywall, "Paywall muss vor dem Mitglieder-Teil stehen");
});

test("prepareFullText: ohne Mitglieder-Überschrift keine Paywall", () => {
  const out = prepareFullText("<h1>T</h1><p>Nur öffentlich.</p>", "");
  assert.ok(!out.includes("steady_paywall"));
});

test("prepareFullText: eigene Überschrift mit Regex-Sonderzeichen schneidet korrekt", () => {
  // memberHeading kommt aus kit.config.js (Publisher-Input) — Klammern & Co.
  // dürfen das Suchmuster nicht brechen.
  const html = `<p>Frei.</p><h2>Nur für Member (Teil 2)</h2><p>Geheim.</p>`;
  const out = prepareFullText(html, "", "Nur für Member (Teil 2)");
  const paywall = out.indexOf('id="steady_paywall"');
  assert.ok(paywall >= 0, "Paywall-Element fehlt");
  assert.ok(out.indexOf("Geheim.") > paywall);
});

test("renderOnboarding: zweisprachig, noindex, self-contained", () => {
  const html = renderOnboarding();
  assert.ok(html.includes("Richte meine Seite ein"));
  assert.ok(html.includes("Set up my page"));
  assert.ok(html.includes("kit.config.js"));
  assert.match(html, /<meta name="robots" content="noindex"\/>/);
  assert.ok(!html.includes("widget_loader"), "Onboarding lädt kein Steady-Widget");
});

const ITEM = {
  title: "Testpost", description: "Teaser.", categories: ["startup"],
  image: "https://img.example/x.jpg", link: "https://steady.page/p/1",
  guid: "abc-123", pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "",
};

test("renderPost: SEO-Meta, echte Reaktionen, Nachbar-Navigation", () => {
  // cfg.site/steadyId = Env-Override-Pfad (buildPageContext) — das Template selbst
  // hat keine Origin/Publikations-ID eingebrannt.
  const cfg = { site: "https://example.com", steadyId: "11111111-2222-3333-4444-555555555555" };
  const html = renderPost(ITEM, cfg, FULL, { claps: 7, prev: { guid: "p1", title: "Älter" }, next: null });
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.com\/posts\/abc-123"\/>/);
  assert.match(html, /property="og:type" content="article"/);
  assert.ok(html.includes("widget_loader/11111111-2222-3333-4444-555555555555"));
  assert.ok(html.includes('id="steady_paywall"'));
  assert.ok(html.includes('id="js-clap-n">7<'));            // Clap-Zähler aus KV
  assert.ok(!html.includes("post__live"));                  // kein Fake-Live-Dot mehr
  assert.ok(html.includes("Älterer Beitrag"));              // Prev-Link
});

test(
  "renderPost: ohne Publikations-ID und Origin kein Widget-Script, kein Canonical",
  // In Publisher-Forks ist kit.config.js gefüllt → Defaults sind gesetzt, der
  // Leer-Zustand existiert dort nicht. Test gilt nur für das Template selbst.
  { skip: !!(STEADY_PUBLICATION_ID || SITE_ORIGIN) && "kit.config.js ist gefüllt (Fork)" },
  () => {
    const html = renderPost(ITEM, {}, "", {});
    assert.ok(!html.includes("widget_loader"));
    assert.ok(!html.includes('rel="canonical"'));
  }
);
