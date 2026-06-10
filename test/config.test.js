// test/config.test.js — Slug-Normalisierung, Steady-URL-Ableitung, Konfigurations-Status.
// Die Ableitung ist in pure Funktionen ausgelagert, damit sie unabhängig vom
// Inhalt der kit.config.js (Publisher-Datei!) testbar bleibt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug, deriveSteady, IS_CONFIGURED, FEED_URL, MEMBER_HEADING } from "../functions/_lib/config.js";
import { isConfigured } from "../functions/_lib/settings.js";

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

test("Template-Zustand: kit.config.js wird leer ausgeliefert → unkonfiguriert", () => {
  // Das Template selbst darf keinen Publisher eingebrannt haben.
  assert.equal(FEED_URL, "");
  assert.equal(IS_CONFIGURED, false);
  // Sprach-Default (de) für die Mitglieder-Überschrift bleibt gesetzt.
  assert.equal(MEMBER_HEADING, "Mitglieder-Bereich");
});

test("isConfigured: FEED_URL-Env-Override zählt als konfiguriert", () => {
  assert.equal(isConfigured({ feedUrl: "https://steady.page/x/rss" }), true);
  assert.equal(isConfigured({ feedUrl: null }), IS_CONFIGURED);
  assert.equal(isConfigured(null), IS_CONFIGURED);
});
