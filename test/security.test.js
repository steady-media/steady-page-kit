// test/security.test.js — Authorizer + Secret-Scrubbing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorized } from "../functions/_lib/auth.ts";

function reqWith(code) {
  return new Request("http://x/api/config", { headers: code == null ? {} : { "x-kit-admin": code } });
}

test("isAuthorized: korrekt/falsch/leer/ohne Secret", async () => {
  const env = { KIT_ADMIN_CODE: "geheim-1234567890" };
  assert.equal(await isAuthorized(reqWith("geheim-1234567890"), env), true);
  assert.equal(await isAuthorized(reqWith("falsch"), env), false);
  assert.equal(await isAuthorized(reqWith(""), env), false);
  assert.equal(await isAuthorized(reqWith(null), env), false);
  assert.equal(await isAuthorized(reqWith("egal"), {}), false);
});

import { scrubSecrets, logError } from "../functions/_lib/scrub.ts";

test("scrubSecrets entfernt FULLTEXT_FEED_URL samt Token aus beliebigem Text", () => {
  const env = { FULLTEXT_FEED_URL: "https://steadyhq.com/f/abc?token=SUPERSECRET123" };
  const dirty = `fetch failed for ${env.FULLTEXT_FEED_URL}\ncause: connect to token=SUPERSECRET123`;
  const clean = scrubSecrets(dirty, env);
  assert.ok(!clean.includes("SUPERSECRET123"));
  assert.ok(clean.includes("[redacted]"));
});

test("logError loggt niemals den Volltext-Token (Message, Stack, cause)", () => {
  const env = { FULLTEXT_FEED_URL: "https://steadyhq.com/f/abc?token=SUPERSECRET123" };
  const lines = [];
  const orig = console.error;
  console.error = (...a) => lines.push(a.join(" "));
  try {
    logError(new Error(`feed kaputt: ${env.FULLTEXT_FEED_URL}`, { cause: env.FULLTEXT_FEED_URL }), env);
  } finally { console.error = orig; }
  const all = lines.join("\n");
  assert.ok(all.includes("[steady-page-kit]"));
  assert.ok(!all.includes("SUPERSECRET123"));
});
