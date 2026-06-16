// test/config.test.js — slug normalization, Steady URL derivation, configuration status.
// The derivation is split into pure functions so it stays testable independently of
// the contents of kit.config.js (the publisher file!).
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug, deriveSteady, IS_CONFIGURED, FEED_URL, MEMBER_HEADING, STEADY_SLUG, LANGUAGE, envSteadyUrls, effectiveFeedUrl } from "../functions/_lib/config.ts";
import { isConfigured } from "../functions/_lib/settings.ts";

test("normalizeSlug: bare slugs, @ prefix, whitespace", () => {
  assert.equal(normalizeSlug("sebastian"), "sebastian");
  assert.equal(normalizeSlug("  Sebastian "), "sebastian");
  assert.equal(normalizeSlug("@sebastian"), "sebastian");
  assert.equal(normalizeSlug(""), "");
  assert.equal(normalizeSlug(null), "");
});

test("normalizeSlug: full URLs (publishers like to paste the whole address)", () => {
  assert.equal(normalizeSlug("https://steady.page/sebastian"), "sebastian");
  assert.equal(normalizeSlug("https://steady.page/sebastian/rss"), "sebastian");
  assert.equal(normalizeSlug("steady.page/sebastian"), "sebastian");
  assert.equal(normalizeSlug("https://steadyhq.com/de/krautreporter/about"), "krautreporter");
  assert.equal(normalizeSlug("https://steady.page/"), "");
});

test("deriveSteady: URLs from slug + language, locale-aware", () => {
  const de = deriveSteady("sebastian", "de");
  assert.equal(de.feedUrl, "https://steady.page/sebastian/rss");
  assert.equal(de.loginUrl, "https://steady.page/de/log_in?publication=sebastian");
  assert.equal(de.newsletterUrl, "https://steady.page/de/sebastian/newsletter/sign_up");

  const en = deriveSteady("acme", "en");
  assert.equal(en.feedUrl, "https://steady.page/acme/rss");
  assert.equal(en.loginUrl, "https://steady.page/en/log_in?publication=acme");
  assert.equal(en.newsletterUrl, "https://steady.page/en/acme/newsletter/sign_up");
});

test("deriveSteady: empty slug → empty URLs (onboarding mode)", () => {
  const d = deriveSteady("", "de");
  assert.equal(d.feedUrl, "");
  assert.equal(d.loginUrl, "");
  assert.equal(d.newsletterUrl, "");
});

test("kit.config.js: derivations consistent — holds for the template AND filled forks", () => {
  // Deliberately NO emptiness test: publisher forks have kit.config.js filled,
  // and `npm test` must be just as green there as in the empty template.
  assert.equal(IS_CONFIGURED, FEED_URL !== "");
  assert.equal(FEED_URL, deriveSteady(STEADY_SLUG, LANGUAGE).feedUrl);
  assert.ok(MEMBER_HEADING.length > 0); // configured empty → language default applies
});

test("isConfigured: FEED_URL env override counts as configured", () => {
  assert.equal(isConfigured({ feedUrl: "https://steady.page/x/rss" }), true);
  assert.equal(isConfigured({ feedUrl: null }), IS_CONFIGURED);
  assert.equal(isConfigured(null), IS_CONFIGURED);
});

test("envSteadyUrls: derives from STEADY_SLUG (one-click without editing kit.config.js)", () => {
  const u = envSteadyUrls({ STEADY_SLUG: "sebastian" });
  assert.equal(u.feedUrl, deriveSteady("sebastian", LANGUAGE).feedUrl);
  assert.equal(u.loginUrl, deriveSteady("sebastian", LANGUAGE).loginUrl);
  // also accepts a full URL (publishers like to paste everything)
  assert.equal(envSteadyUrls({ STEADY_SLUG: "https://steady.page/acme/rss" }).feedUrl, "https://steady.page/acme/rss");
  // without a slug → null
  assert.equal(envSteadyUrls({}), null);
  assert.equal(envSteadyUrls(null), null);
});

test("effectiveFeedUrl: precedence FEED_URL > STEADY_SLUG > kit.config.js", () => {
  // explicit FEED_URL wins
  assert.equal(effectiveFeedUrl({ FEED_URL: "https://x/rss", STEADY_SLUG: "acme" }), "https://x/rss");
  // otherwise derived from the slug
  assert.equal(effectiveFeedUrl({ STEADY_SLUG: "acme" }), "https://steady.page/acme/rss");
  // without env override → default from kit.config.js (the FEED_URL constant)
  assert.equal(effectiveFeedUrl({}), FEED_URL);
  assert.equal(effectiveFeedUrl(null), FEED_URL);
});

// --- PUT /api/config: persist kitpins (admin-gated) ---
import { onRequestPut } from "../functions/api/config.ts";

function memKV() {
  const m = new Map();
  return {
    get: async (k) => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
  };
}

test("PUT /api/config saves kitpins (with admin code)", async () => {
  const kv = memKV();
  const env = { KIT_KV: kv, KIT_ADMIN_CODE: "secret" };
  const pins = JSON.stringify({ "/": ["g1"] });
  const req = new Request("https://x/api/config", {
    method: "PUT",
    headers: { "x-kit-admin": "secret", "content-type": "application/json" },
    body: JSON.stringify({ skin: {}, kitstruct: "", kitchrome: "", kitpins: pins }),
  });
  const res = await onRequestPut(/** @type {any} */ ({ request: req, env }));
  assert.equal(res.status, 200);
  const saved = JSON.parse(await kv.get("config"));
  assert.equal(saved.kitpins, pins);
});

test("PUT /api/config without admin code → 401", async () => {
  const env = { KIT_KV: memKV(), KIT_ADMIN_CODE: "secret" };
  const req = new Request("https://x/api/config", {
    method: "PUT", headers: { "content-type": "application/json" }, body: "{}",
  });
  const res = await onRequestPut(/** @type {any} */ ({ request: req, env }));
  assert.equal(res.status, 401);
});
