#!/usr/bin/env node
// scripts/doctor.js — Gesundheitscheck des Kits. `npm run doctor`
//
// Das deterministische Erfolgssignal für Setup-Agents (docs/agent/SETUP.md):
//   Exit 0  = bereit (⚠️-Warnungen sind ok, aber lesen!)
//   Exit 1  = mindestens ein Blocker (❌)
//
// --offline überspringt alle Netz-Checks (CI). Der unkonfigurierte
// Template-Zustand (leere kit.config.js) ist KEIN Fehler — er ergibt die
// Onboarding-Seite und nur eine Warnung.
//
// Sicherheits-Regel: FULLTEXT_FEED_URL enthält den Auth-Token und wird
// NIEMALS ausgegeben — auch nicht in Fehlermeldungen.

import { readFileSync } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import kit from "../kit.config.js";
import {
  STEADY_SLUG, FEED_URL, SITE_ORIGIN, STEADY_PUBLICATION_ID,
  MEMBER_HEADING, IS_CONFIGURED, LANGUAGE, USER_AGENT,
} from "../functions/_lib/config.js";
import { loadDotEnv } from "../server/env.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OFFLINE = process.argv.includes("--offline");

// Secrets aus beiden lokalen Quellen (Node-Pfad + Cloudflare-Pfad) einsammeln.
loadDotEnv(join(ROOT, ".env"));
loadDotEnv(join(ROOT, ".dev.vars"));

let blockers = 0;
const ok = m => console.log("  ✅ " + m);
const warn = m => console.log("  ⚠️  " + m);
const fail = m => { console.log("  ❌ " + m); blockers++; };

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
      if (!text.includes(wantBody)) return { ok: false, why: `Antwort enthält kein "${wantBody}"` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, why: e.name === "TimeoutError" ? "Timeout" : (e.cause && e.cause.code) || e.message };
  }
}

console.log(`\nsteady-page-kit doctor${OFFLINE ? " (--offline)" : ""}\n`);

/* — 1. Umgebung — */
console.log("Umgebung / environment");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major >= 22) ok(`Node ${process.versions.node}`);
else if (major >= 20) warn(`Node ${process.versions.node} — funktioniert; empfohlen ist Node 22 LTS`);
else fail(`Node ${process.versions.node} — zu alt, mindestens Node 20 nötig`);

/* — 2. kit.config.js — */
console.log("\nkit.config.js");
if (kit.language === "de" || kit.language === "en") ok(`language: "${LANGUAGE}"`);
else warn(`language: "${kit.language}" unbekannt → Fallback "de"`);

const envFeed = (process.env.FEED_URL || "").trim();
if (!IS_CONFIGURED && !envFeed) {
  warn("steady.slug ist leer → Onboarding-Modus. Setup: docs/agent/SETUP.md");
} else {
  ok(`steady.slug: "${STEADY_SLUG || "(über FEED_URL-Env)"}"`);
  if (!String(kit.publication || "").trim()) warn("publication ist leer → generischer Fallback-Name");
  if (!STEADY_PUBLICATION_ID && !(process.env.STEADY_PUBLICATION_ID || "").trim()) {
    warn("steady.publicationId fehlt → kein Steady-Widget (Login/Paywall/Checkout deaktiviert)");
  } else if (STEADY_PUBLICATION_ID && !/^[0-9a-f-]{36}$/i.test(STEADY_PUBLICATION_ID)) {
    fail(`steady.publicationId sieht nicht wie eine UUID aus: "${STEADY_PUBLICATION_ID}"`);
  } else {
    ok("steady.publicationId gesetzt");
  }
  if (!SITE_ORIGIN && !(process.env.SITE_ORIGIN || "").trim()) {
    warn("siteOrigin ist leer → keine canonical/og:url, Sitemap ohne Domain");
  } else {
    ok(`siteOrigin: ${SITE_ORIGIN || process.env.SITE_ORIGIN}`);
  }
  ok(`memberHeading: "${MEMBER_HEADING}" (muss exakt der Überschrift im Steady-Editor entsprechen)`);
}

/* — 3. Secrets — */
console.log("\nSecrets (.env / .dev.vars / Host-Env)");
const adminCode = (process.env.KIT_ADMIN_CODE || "").trim();
if (!adminCode) warn("KIT_ADMIN_CODE fehlt → „Für alle Besucher speichern“/Logo-Upload sind deaktiviert");
else if (adminCode.length < 8) warn("KIT_ADMIN_CODE ist sehr kurz — mindestens 8 Zeichen empfohlen");
else ok("KIT_ADMIN_CODE gesetzt");
const fulltext = (process.env.FULLTEXT_FEED_URL || "").trim();
if (!fulltext) warn("FULLTEXT_FEED_URL fehlt → Posts zeigen Teaser + Steady-Link statt Volltext (optional)");

/* — 4. Cloudflare-Konfiguration (nur relevant für deploy:cf) — */
console.log("\nCloudflare (wrangler.toml — nur für Cloudflare-Deploys relevant)");
try {
  const wrangler = readFileSync(join(ROOT, "wrangler.toml"), "utf8");
  const kvId = (wrangler.match(/^\s*id\s*=\s*"([^"]*)"/m) || [])[1] || "";
  if (/REPLACE|XXXX|^$/i.test(kvId)) warn("KV-Namespace-ID ist noch Platzhalter → vor deploy:cf erzeugen (siehe docs/agent/deploy/cloudflare.md)");
  else ok("KV-Namespace-ID gesetzt");
} catch (e) {
  warn("wrangler.toml nicht lesbar");
}

/* — 5. Storage (Node-Pfad) — */
console.log("\nStorage (Node-Pfad, data/)");
try {
  const dir = process.env.KIT_DATA_DIR || join(ROOT, "data");
  await mkdir(dir, { recursive: true });
  const probeFile = join(dir, ".doctor-probe");
  await writeFile(probeFile, "ok");
  await unlink(probeFile);
  ok(`Datenverzeichnis beschreibbar: ${dir}`);
} catch (e) {
  warn("Datenverzeichnis nicht beschreibbar — auf Cloudflare egal (KV), auf Node-Hosts ein Problem");
}

/* — 6. Netz-Checks — */
if (!OFFLINE) {
  console.log("\nSteady-Anbindung (Netz)");
  const feedUrl = envFeed || FEED_URL;
  if (feedUrl) {
    const r = await probe(feedUrl, { wantBody: "<rss" });
    if (r.ok) ok("Öffentlicher Feed erreichbar und ist RSS");
    else fail(`Öffentlicher Feed nicht nutzbar (${r.why}) — Slug prüfen: ${feedUrl}`);
  }
  const widgetId = (process.env.STEADY_PUBLICATION_ID || "").trim() || STEADY_PUBLICATION_ID;
  if (widgetId) {
    const r = await probe(`https://steady.page/widget_loader/${widgetId}`);
    if (r.ok) ok("Steady widget_loader antwortet (Login/Paywall/Checkout)");
    else fail(`widget_loader nicht erreichbar (${r.why}) — publicationId prüfen`);
  }
  if (fulltext) {
    const r = await probe(fulltext, { wantBody: "content:encoded" });
    if (r.ok) ok("Volltext-Feed liefert content:encoded");
    else fail(`Volltext-Feed nicht nutzbar (${r.why}) — URL aus dem Steady-Backend neu kopieren (wird hier nicht angezeigt)`);
  }
}

console.log("");
if (blockers) {
  console.log(`❌ ${blockers} Blocker — siehe oben. / ${blockers} blocker(s), see above.\n`);
  process.exit(1);
}
console.log("✅ Bereit. / Ready.\n");
