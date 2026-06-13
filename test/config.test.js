// test/config.test.js — Slug-Normalisierung, Steady-URL-Ableitung, Konfigurations-Status.
// Die Ableitung ist in pure Funktionen ausgelagert, damit sie unabhängig vom
// Inhalt der kit.config.js (Publisher-Datei!) testbar bleibt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug, deriveSteady, IS_CONFIGURED, FEED_URL, MEMBER_HEADING, STEADY_SLUG, LANGUAGE, envSteadyUrls, effectiveFeedUrl } from "../functions/_lib/config.ts";
import { isConfigured } from "../functions/_lib/settings.ts";

test("normalizeSlug: nackte Slugs, @-Präfix, Whitespace", () => {
  assert.equal(normalizeSlug("sebastian"), "sebastian");
  assert.equal(normalizeSlug("  Sebastian "), "sebastian");
  assert.equal(normalizeSlug("@sebastian"), "sebastian");
  assert.equal(normalizeSlug(""), "");
  assert.equal(normalizeSlug(null), "");
});

test("normalizeSlug: komplette URLs (Publisher pasten gern die ganze Adresse)", () => {
  assert.equal(normalizeSlug("https://steady.page/sebastian"), "sebastian");
  assert.equal(normalizeSlug("https://steady.page/sebastian/rss"), "sebastian");
  assert.equal(normalizeSlug("steady.page/sebastian"), "sebastian");
  assert.equal(normalizeSlug("https://steadyhq.com/de/krautreporter/about"), "krautreporter");
  assert.equal(normalizeSlug("https://steady.page/"), "");
});

test("deriveSteady: URLs aus Slug + Sprache, locale-bewusst", () => {
  const de = deriveSteady("sebastian", "de");
  assert.equal(de.feedUrl, "https://steady.page/sebastian/rss");
  assert.equal(de.loginUrl, "https://steady.page/de/log_in?publication=sebastian");
  assert.equal(de.newsletterUrl, "https://steady.page/de/sebastian/newsletter/sign_up");

  const en = deriveSteady("acme", "en");
  assert.equal(en.feedUrl, "https://steady.page/acme/rss");
  assert.equal(en.loginUrl, "https://steady.page/en/log_in?publication=acme");
  assert.equal(en.newsletterUrl, "https://steady.page/en/acme/newsletter/sign_up");
});

test("deriveSteady: leerer Slug → leere URLs (Onboarding-Modus)", () => {
  const d = deriveSteady("", "de");
  assert.equal(d.feedUrl, "");
  assert.equal(d.loginUrl, "");
  assert.equal(d.newsletterUrl, "");
});

test("kit.config.js: Ableitungen konsistent — gilt für Template UND gefüllte Forks", () => {
  // Bewusst KEIN Test auf Leere: Publisher-Forks haben kit.config.js gefüllt,
  // und `npm test` muss dort genauso grün sein wie im leeren Template.
  assert.equal(IS_CONFIGURED, FEED_URL !== "");
  assert.equal(FEED_URL, deriveSteady(STEADY_SLUG, LANGUAGE).feedUrl);
  assert.ok(MEMBER_HEADING.length > 0); // leer konfiguriert → Sprach-Default greift
});

test("isConfigured: FEED_URL-Env-Override zählt als konfiguriert", () => {
  assert.equal(isConfigured({ feedUrl: "https://steady.page/x/rss" }), true);
  assert.equal(isConfigured({ feedUrl: null }), IS_CONFIGURED);
  assert.equal(isConfigured(null), IS_CONFIGURED);
});

test("envSteadyUrls: leitet aus STEADY_SLUG ab (One-Click ohne kit.config.js-Edit)", () => {
  const u = envSteadyUrls({ STEADY_SLUG: "sebastian" });
  assert.equal(u.feedUrl, deriveSteady("sebastian", LANGUAGE).feedUrl);
  assert.equal(u.loginUrl, deriveSteady("sebastian", LANGUAGE).loginUrl);
  // akzeptiert auch eine ganze URL (Publisher pasten gern alles)
  assert.equal(envSteadyUrls({ STEADY_SLUG: "https://steady.page/acme/rss" }).feedUrl, "https://steady.page/acme/rss");
  // ohne Slug → null
  assert.equal(envSteadyUrls({}), null);
  assert.equal(envSteadyUrls(null), null);
});

test("effectiveFeedUrl: Präzedenz FEED_URL > STEADY_SLUG > kit.config.js", () => {
  // explizite FEED_URL gewinnt
  assert.equal(effectiveFeedUrl({ FEED_URL: "https://x/rss", STEADY_SLUG: "acme" }), "https://x/rss");
  // sonst aus dem Slug abgeleitet
  assert.equal(effectiveFeedUrl({ STEADY_SLUG: "acme" }), "https://steady.page/acme/rss");
  // ohne Env-Override → Default aus kit.config.js (FEED_URL-Konstante)
  assert.equal(effectiveFeedUrl({}), FEED_URL);
  assert.equal(effectiveFeedUrl(null), FEED_URL);
});
