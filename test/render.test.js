// test/render.test.js — Volltext-Aufbereitung (Titel-Echo, Lede-Dedup, Paywall-Schnitt)
// + Smoke-Test, dass renderPost die SEO- und Paywall-Bausteine wirklich ausgibt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareFullText, renderPost } from "../functions/_lib/render.js";

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

const ITEM = {
  title: "Testpost", description: "Teaser.", categories: ["startup"],
  image: "https://img.example/x.jpg", link: "https://steady.page/p/1",
  guid: "abc-123", pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "",
};

test("renderPost: SEO-Meta, echte Reaktionen, Nachbar-Navigation", () => {
  const html = renderPost(ITEM, {}, FULL, { claps: 7, prev: { guid: "p1", title: "Älter" }, next: null });
  assert.match(html, /<link rel="canonical" href="[^"]+\/posts\/abc-123"\/>/);
  assert.match(html, /property="og:type" content="article"/);
  assert.ok(html.includes('id="steady_paywall"'));
  assert.ok(html.includes('id="js-clap-n">7<'));            // Clap-Zähler aus KV
  assert.ok(!html.includes("post__live"));                  // kein Fake-Live-Dot mehr
  assert.ok(html.includes("Älterer Beitrag"));              // Prev-Link
});
