// test/security.test.js — authorizer + secret scrubbing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorized } from "../functions/_lib/auth.ts";

function reqWith(code) {
  return new Request("http://x/api/config", { headers: code == null ? {} : { "x-kit-admin": code } });
}

test("isAuthorized: correct/wrong/empty/no secret", async () => {
  const env = { KIT_ADMIN_CODE: "geheim-1234567890" };
  assert.equal(await isAuthorized(reqWith("geheim-1234567890"), env), true);
  assert.equal(await isAuthorized(reqWith("falsch"), env), false);
  assert.equal(await isAuthorized(reqWith(""), env), false);
  assert.equal(await isAuthorized(reqWith(null), env), false);
  assert.equal(await isAuthorized(reqWith("egal"), {}), false);
});

import { scrubSecrets, logError } from "../functions/_lib/scrub.ts";

test("scrubSecrets removes FULLTEXT_FEED_URL and its token from arbitrary text", () => {
  const env = { FULLTEXT_FEED_URL: "https://steadyhq.com/f/abc?token=SUPERSECRET123" };
  const dirty = `fetch failed for ${env.FULLTEXT_FEED_URL}\ncause: connect to token=SUPERSECRET123`;
  const clean = scrubSecrets(dirty, env);
  assert.ok(!clean.includes("SUPERSECRET123"));
  assert.ok(clean.includes("[redacted]"));
});

test("logError never logs the full-text token (message, stack, cause)", () => {
  const env = { FULLTEXT_FEED_URL: "https://steadyhq.com/f/abc?token=SUPERSECRET123" };
  const lines = [];
  const orig = console.error;
  console.error = (...a) => lines.push(a.join(" "));
  try {
    logError(new Error(`feed broken: ${env.FULLTEXT_FEED_URL}`, { cause: env.FULLTEXT_FEED_URL }), env);
  } finally { console.error = orig; }
  const all = lines.join("\n");
  assert.ok(all.includes("[steady-page-kit]"));
  assert.ok(!all.includes("SUPERSECRET123"));
});

test("scrubSecrets removes TCHOP_TOKEN from arbitrary text", () => {
  const env = { TCHOP_TOKEN: "tchop-bearer-DEADBEEF42" };
  const dirty = `tchop request failed with Authorization: Bearer ${env.TCHOP_TOKEN}`;
  const clean = scrubSecrets(dirty, env);
  assert.ok(!clean.includes("tchop-bearer-DEADBEEF42"));
  assert.ok(clean.includes("[redacted]"));
});

test("logError never logs TCHOP_TOKEN (message, stack, cause)", () => {
  const env = { TCHOP_TOKEN: "tchop-bearer-DEADBEEF42" };
  const lines = [];
  const orig = console.error;
  console.error = (...a) => lines.push(a.join(" "));
  try {
    logError(new Error(`tchop fetch failed: Bearer ${env.TCHOP_TOKEN}`, { cause: env.TCHOP_TOKEN }), env);
  } finally { console.error = orig; }
  const all = lines.join("\n");
  assert.ok(all.includes("[steady-page-kit]"));
  assert.ok(!all.includes("tchop-bearer-DEADBEEF42"));
});
