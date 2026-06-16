// test/render.test.js — full-text preparation (title echo, lede dedup, paywall cut)
// + smoke test that renderPost really emits the SEO and paywall building blocks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareFullText, renderPost, renderOnboarding, applyPins, renderLanding, renderSection } from "../functions/_lib/render.ts";
import { STEADY_PUBLICATION_ID, SITE_ORIGIN } from "../functions/_lib/config.ts";

const FULL = `<h1>Mein Titel</h1><p>Die Lede aus dem Feed.</p><p>Öffentlicher Absatz.</p>
<hr aria-hidden="true"/><h2><mark style="background-color: rgb(230, 243, 251); color: inherit">Mitglieder-Bereich</mark><strong><mark style="background-color: rgb(230, 243, 251); color: inherit"> 🔒</mark></strong></h2><p>Geheimer Inhalt.</p>`;

test("prepareFullText: title echo + duplicate lede removed, marks stripped", () => {
  const out = prepareFullText(FULL, "Die Lede aus dem Feed.");
  assert.ok(!out.includes("<h1>"));
  assert.ok(!out.includes("Die Lede aus dem Feed."));
  assert.ok(!out.includes("<mark"));
  assert.ok(out.includes("Öffentlicher Absatz."));
});

test("prepareFullText: Steady paywall element comes BEFORE the member heading", () => {
  const out = prepareFullText(FULL, "");
  const paywall = out.indexOf('id="steady_paywall"');
  const member = out.indexOf("Mitglieder-Bereich");
  assert.ok(paywall >= 0, "paywall element missing");
  assert.ok(member > paywall, "paywall must come before the member section");
});

test("prepareFullText: no paywall without a member heading", () => {
  const out = prepareFullText("<h1>T</h1><p>Nur öffentlich.</p>", "");
  assert.ok(!out.includes("steady_paywall"));
});

test("prepareFullText: custom heading with regex special chars cuts correctly", () => {
  // memberHeading comes from kit.config.js (publisher input) — parentheses & co.
  // must not break the search pattern.
  const html = `<p>Frei.</p><h2>Nur für Member (Teil 2)</h2><p>Geheim.</p>`;
  const out = prepareFullText(html, "", "Nur für Member (Teil 2)");
  const paywall = out.indexOf('id="steady_paywall"');
  assert.ok(paywall >= 0, "paywall element missing");
  assert.ok(out.indexOf("Geheim.") > paywall);
});

test("renderOnboarding: bilingual, noindex, self-contained", () => {
  const html = renderOnboarding();
  assert.ok(html.includes("Richte meine Seite ein"));
  assert.ok(html.includes("Set up my page"));
  assert.ok(html.includes("kit.config.js"));
  assert.match(html, /<meta name="robots" content="noindex"\/>/);
  assert.ok(!html.includes("widget_loader"), "onboarding loads no Steady widget");
});

const ITEM = {
  title: "Testpost", description: "Teaser.", categories: ["startup"],
  image: "https://img.example/x.jpg", link: "https://steady.page/p/1",
  guid: "abc-123", pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "",
};

test("renderPost: SEO meta, real reactions, neighbor navigation", () => {
  // cfg.site/steadyId = env override path (buildPageContext) — the template itself
  // has no origin/publication ID baked in.
  const cfg = { site: "https://example.com", steadyId: "11111111-2222-3333-4444-555555555555" };
  const html = renderPost(ITEM, cfg, FULL, { claps: 7, prev: { guid: "p1", title: "Älter" }, next: null });
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.com\/posts\/abc-123"\/>/);
  assert.match(html, /property="og:type" content="article"/);
  assert.ok(html.includes("widget_loader/11111111-2222-3333-4444-555555555555"));
  assert.ok(html.includes('id="steady_paywall"'));
  assert.ok(html.includes('id="js-clap-n">7<'));            // clap counter from KV
  assert.ok(!html.includes("post__live"));                  // no fake live dot anymore
  assert.ok(html.includes("Älterer Beitrag"));              // prev link
});

const PINITEMS = ["g1", "g2", "g3", "g4"].map((g) => ({
  title: g, description: "", categories: [], image: "", link: "", guid: g, pubDate: "", content: "",
}));
const ids = (arr) => arr.map((i) => i.guid);

test("applyPins: pinned first in order, rest chronological", () => {
  assert.deepEqual(ids(applyPins(PINITEMS, ["g3", "g1"])), ["g3", "g1", "g2", "g4"]);
});
test("applyPins: empty/missing list = no-op", () => {
  assert.deepEqual(ids(applyPins(PINITEMS, [])), ["g1", "g2", "g3", "g4"]);
  assert.deepEqual(ids(applyPins(PINITEMS, undefined)), ["g1", "g2", "g3", "g4"]);
});
test("applyPins: unknown GUIDs skipped, duplicates deduplicated", () => {
  assert.deepEqual(ids(applyPins(PINITEMS, ["gX", "g2", "g2"])), ["g2", "g1", "g3", "g4"]);
});

const LANDITEMS = ["g1", "g2", "g3", "g4", "g5"].map((g) => ({
  title: "Titel-" + g, description: "Teaser " + g, categories: ["x"],
  image: "", link: "", guid: g, pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "",
}));

test("renderLanding: pin 1 becomes hero, order respected", () => {
  const cfg = { shell: "single", auf: "klein", stream: "liste", rails: [], pins: { "/": ["g3", "g1"] } };
  const html = renderLanding(LANDITEMS, 1, /** @type {any} */ (cfg));
  assert.match(html, /hero__title[^]*\/posts\/g3/); // g3 is the hero
  assert.ok(html.indexOf("/posts/g3") < html.indexOf("/posts/g1")); // g3 before g1
});

test("renderSection: pin 1 becomes the section's featured", () => {
  const items = ["g1", "g2", "g3"].map((g) => ({
    title: "T-" + g, description: "", categories: ["politik"], image: "", link: "",
    guid: g, pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "",
  }));
  const cfg = { shell: "single", auf: "klein", stream: "liste", rails: [], pins: { "rubrik/politik": ["g2"] } };
  const html = renderSection("politik", items, items, 1, /** @type {any} */ (cfg));
  // Precise: the lead-story title links g2 (not somewhere in the grid).
  assert.ok(html.includes('class="aufmacher__title"><a href="/posts/g2"'));
  // Discriminating: the featured (g2) appears in the HTML before the grid (g1).
  assert.ok(html.indexOf("/posts/g2") < html.indexOf("/posts/g1"));
});

test("renderLanding (rubrik): each section block is its own pin scope (data-pin-scope + reorder)", () => {
  const mk = (g) => ({ title: "T-" + g, description: "d", categories: ["storys"], image: "",
    link: "", guid: g, pubDate: "Mon, 17 Mar 2025 08:00:00 +0000", content: "" });
  const items = ["s1", "s2", "s3", "s4", "s5", "s6"].map(mk);
  const cfg = { shell: "single", auf: "klein", stream: "rubrik", rails: [], pins: { "rubrik/storys": ["s3"] } };
  const html = renderLanding(items, 1, /** @type {any} */ (cfg));
  assert.ok(html.includes('data-pin-scope="rubrik/storys"'));     // section = its own scope
  assert.ok(html.includes('class="feat-main" href="/posts/s3"')); // section pin orders the section
});

test("renderPost: cfg.brand drives <title> and og:site_name", () => {
  const html = renderPost(ITEM, /** @type {any} */ ({ brand: "Marke X" }), "", {});
  assert.match(html, /<title>[^<]*Marke X<\/title>/);
  assert.match(html, /property="og:site_name" content="Marke X"/);
});

test(
  "renderPost: without publication ID and origin no widget script, no canonical",
  // In publisher forks kit.config.js is filled → defaults are set, the empty
  // state doesn't exist there. This test applies only to the template itself.
  { skip: !!(STEADY_PUBLICATION_ID || SITE_ORIGIN) && "kit.config.js is filled (fork)" },
  () => {
    const html = renderPost(ITEM, {}, "", {});
    assert.ok(!html.includes("widget_loader"));
    assert.ok(!html.includes('rel="canonical"'));
  }
);
