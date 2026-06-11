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
