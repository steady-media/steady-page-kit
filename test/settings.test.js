// test/settings.test.js — structure cookie parsing + precedence personal > global.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStruct, effectiveCookie, buildPageContext } from "../functions/_lib/settings.ts";

test("parseStruct without a cookie = default page", () => {
  const s = parseStruct("");
  assert.equal(s.shell, "single");
  assert.equal(s.auf, "klein");
  assert.equal(s.stream, "liste");
  assert.deepEqual(s.rails, []);
  assert.equal(s.search, false);
});

test("parseStruct reads the kitstruct cookie", () => {
  const val = encodeURIComponent("shell=portal&auf=gross&stream=rubrik&rails=neueste,meist&search=1");
  const s = parseStruct("foo=1; kitstruct=" + val);
  assert.equal(s.shell, "portal");
  assert.equal(s.auf, "gross");
  assert.deepEqual(s.rails, ["neueste", "meist"]);
  assert.equal(s.search, true);
});

test("parseStruct discards unknown rails and broken kitchrome", () => {
  const s = parseStruct("kitstruct=" + encodeURIComponent("shell=portal&rails=neueste,boese") + "; kitchrome=%7Bkaputt");
  assert.deepEqual(s.rails, ["neueste"]);
  assert.equal(s.nav, null);
});

test("effectiveCookie: personal cookie beats global structure", () => {
  const g = { kitstruct: "shell%3Dportal", kitchrome: "%7B%22brand%22%3A%22G%22%7D" };
  // without personal cookies → global applies
  assert.match(effectiveCookie("", g), /kitstruct=shell%3Dportal/);
  // with a personal kitstruct → the global value is NOT appended
  const merged = effectiveCookie("kitstruct=" + encodeURIComponent("shell=single"), g);
  assert.equal((merged.match(/kitstruct=/g) || []).length, 1);
  assert.match(merged, /kitchrome=/); // a missing kitchrome still comes from global
});

test("parseStruct: kitpins is read, capped at 3 per scope", () => {
  const val = encodeURIComponent(JSON.stringify({ "/": ["g1", "g2", "g3", "g4"], "rubrik/politik": ["a"] }));
  const s = parseStruct("kitpins=" + val);
  assert.deepEqual(s.pins["/"], ["g1", "g2", "g3"]);
  assert.deepEqual(s.pins["rubrik/politik"], ["a"]);
});

test("parseStruct: without kitpins, pins is an empty map", () => {
  assert.deepEqual(parseStruct("").pins, {});
});

test("parseStruct: broken kitpins → empty map", () => {
  assert.deepEqual(parseStruct("kitpins=%7Bkaputt").pins, {});
});

test("effectiveCookie: global kitpins applies without a personal cookie", () => {
  const g = { kitpins: encodeURIComponent(JSON.stringify({ "/": ["g1"] })) };
  assert.match(effectiveCookie("", g), /kitpins=/);
  const merged = effectiveCookie("kitpins=" + encodeURIComponent(JSON.stringify({ "/": ["x"] })), g);
  assert.equal((merged.match(/kitpins=/g) || []).length, 1); // personal wins
});

test("buildPageContext: a kitpins cookie forces no-store", async () => {
  const ctx = { env: {}, request: new Request("https://example.com/", { headers: { cookie: "kitpins=%7B%7D" } }) };
  const { cacheControl } = await buildPageContext(/** @type {any} */ (ctx));
  assert.equal(cacheControl, "no-store");
});
