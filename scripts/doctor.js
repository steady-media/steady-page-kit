#!/usr/bin/env node
// @ts-check
// scripts/doctor.js — health check for the kit. `npm run doctor`
//
// The deterministic success signal for setup agents (docs/agent/SETUP.md):
//   Exit 0  = ready (⚠️ warnings are ok, but read them!)
//   Exit 1  = at least one blocker (❌)
//
// --offline skips all network checks (CI). The unconfigured template state
// (empty kit.config.js) is NOT an error — it yields the onboarding page and
// only a warning.
//
// Security rule: FULLTEXT_FEED_URL contains the auth token and is NEVER
// printed — not even in error messages.

import { readFileSync } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import kit from "../kit.config.js";
import { loadDotEnv } from "../server/env.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OFFLINE = process.argv.includes("--offline");

let blockers = 0;
const ok = /** @param {string} m */ m => console.log("  ✅ " + m);
const warn = /** @param {string} m */ m => console.log("  ⚠️  " + m);
const fail = /** @param {string} m */ m => { console.log("  ❌ " + m); blockers++; };

/** Print the summary and exit the process. */
function finish() {
  console.log("");
  if (blockers) {
    console.log(`❌ ${blockers} blocker(s) — see above.\n`);
    process.exit(1);
  }
  console.log("✅ Ready.\n");
}

/**
 * @param {string} url
 * @param {{ wantBody?: string, label?: string }} [opts]
 */
async function probe(url, { wantBody, label } = {}) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    if (wantBody) {
      const text = await res.text();
      if (!text.includes(wantBody)) return { ok: false, why: `response does not contain "${wantBody}"` };
    }
    return { ok: true };
  } catch (e) {
    const err = /** @type {any} */ (e);
    return { ok: false, why: err.name === "TimeoutError" ? "Timeout" : (err.cause && err.cause.code) || err.message };
  }
}

console.log(`\nsteady-page-kit doctor${OFFLINE ? " (--offline)" : ""}\n`);

/* — 1. Environment — */
console.log("environment");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 22 || (major === 22 && minor >= 18)) ok(`Node ${process.versions.node}`);
else { fail(`Node ${process.versions.node} — too old; v2 needs >= 22.18 (recommended: Node 24 LTS)`); finish(); }

const { STEADY_SLUG, FEED_URL, SITE_ORIGIN, STEADY_PUBLICATION_ID,
        MEMBER_HEADING, IS_CONFIGURED, LANGUAGE, USER_AGENT } =
  await import("../functions/_lib/config.ts");

// Collect secrets from both local sources (Node path + Cloudflare path).
loadDotEnv(join(ROOT, ".env"));
loadDotEnv(join(ROOT, ".dev.vars"));

/* — 2. kit.config.js — */
console.log("\nkit.config.js");
if (kit.language === "de" || kit.language === "en") ok(`language: "${LANGUAGE}"`);
else warn(`language: "${kit.language}" unknown → fallback "de"`);

const envFeed = (process.env.FEED_URL || "").trim();
if (!IS_CONFIGURED && !envFeed) {
  warn("steady.slug is empty → onboarding mode. Setup: docs/agent/SETUP.md");
} else {
  ok(`steady.slug: "${STEADY_SLUG || "(via FEED_URL env)"}"`);
  if (!String(kit.publication || "").trim()) warn("publication is empty → generic fallback name");
  if (!STEADY_PUBLICATION_ID && !(process.env.STEADY_PUBLICATION_ID || "").trim()) {
    warn("steady.publicationId missing → no Steady widget (login/paywall/checkout disabled)");
  } else if (STEADY_PUBLICATION_ID && !/^[0-9a-f-]{36}$/i.test(STEADY_PUBLICATION_ID)) {
    fail(`steady.publicationId doesn't look like a UUID: "${STEADY_PUBLICATION_ID}"`);
  } else {
    ok("steady.publicationId set");
  }
  if (!SITE_ORIGIN && !(process.env.SITE_ORIGIN || "").trim()) {
    warn("siteOrigin is empty → no canonical/og:url, sitemap without a domain");
  } else {
    ok(`siteOrigin: ${SITE_ORIGIN || process.env.SITE_ORIGIN}`);
  }
  ok(`memberHeading: "${MEMBER_HEADING}" (must exactly match the heading in the Steady editor)`);
}

/* — 3. Secrets — */
console.log("\nSecrets (.env / .dev.vars / host env)");
const adminCode = (process.env.KIT_ADMIN_CODE || "").trim();
if (!adminCode) warn("KIT_ADMIN_CODE missing → \"Publish for all visitors\" / logo upload are disabled");
else if (adminCode.length < 12) warn("KIT_ADMIN_CODE is shorter than 12 characters — please use a long, random code");
else ok("KIT_ADMIN_CODE set");
const fulltext = (process.env.FULLTEXT_FEED_URL || "").trim();
if (!fulltext) warn("FULLTEXT_FEED_URL missing → posts show teaser + Steady link instead of full text (optional)");

/* — 4. Cloudflare configuration (only relevant for deploy:cf) — */
console.log("\nCloudflare (wrangler.toml — only relevant for Cloudflare deploys)");
try {
  const wrangler = readFileSync(join(ROOT, "wrangler.toml"), "utf8");
  const kvId = (wrangler.match(/^\s*id\s*=\s*"([^"]*)"/m) || [])[1] || "";
  if (/REPLACE|XXXX|^$/i.test(kvId)) warn("KV namespace ID is still a placeholder → create it before deploy:cf (see docs/agent/deploy/cloudflare.md)");
  else ok("KV namespace ID set");
} catch (e) {
  warn("wrangler.toml not readable");
}

/* — 5. Storage (Node path) — */
console.log("\nStorage (Node path, data/)");
try {
  const dir = process.env.KIT_DATA_DIR || join(ROOT, "data");
  await mkdir(dir, { recursive: true });
  const probeFile = join(dir, ".doctor-probe");
  await writeFile(probeFile, "ok");
  await unlink(probeFile);
  ok(`data directory writable: ${dir}`);
} catch (e) {
  warn("data directory not writable — irrelevant on Cloudflare (KV), a problem on Node hosts");
}

/* — 6. Network checks — */
if (!OFFLINE) {
  console.log("\nSteady connectivity (network)");
  const feedUrl = envFeed || FEED_URL;
  if (feedUrl) {
    const r = await probe(feedUrl, { wantBody: "<rss" });
    if (r.ok) ok("public feed reachable and is RSS");
    else fail(`public feed not usable (${r.why}) — check the slug: ${feedUrl}`);
  }
  const widgetId = (process.env.STEADY_PUBLICATION_ID || "").trim() || STEADY_PUBLICATION_ID;
  if (widgetId) {
    const r = await probe(`https://steady.page/widget_loader/${widgetId}`);
    if (r.ok) ok("Steady widget_loader responds (login/paywall/checkout)");
    else fail(`widget_loader unreachable (${r.why}) — check the publicationId`);
  }
  if (fulltext) {
    const r = await probe(fulltext, { wantBody: "content:encoded" });
    if (r.ok) ok("full-text feed delivers content:encoded");
    else fail(`full-text feed not usable (${r.why}) — re-copy the URL from the Steady backend (not shown here)`);
  }
}

finish();
