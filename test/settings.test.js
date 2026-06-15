// test/settings.test.js — Struktur-Cookie-Parsing + Präzedenz persönlich > global.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStruct, effectiveCookie, buildPageContext } from "../functions/_lib/settings.ts";

test("parseStruct ohne Cookie = Default-Seite", () => {
  const s = parseStruct("");
  assert.equal(s.shell, "single");
  assert.equal(s.auf, "klein");
  assert.equal(s.stream, "liste");
  assert.deepEqual(s.rails, []);
  assert.equal(s.search, false);
});

test("parseStruct liest kitstruct-Cookie", () => {
  const val = encodeURIComponent("shell=portal&auf=gross&stream=rubrik&rails=neueste,meist&search=1");
  const s = parseStruct("foo=1; kitstruct=" + val);
  assert.equal(s.shell, "portal");
  assert.equal(s.auf, "gross");
  assert.deepEqual(s.rails, ["neueste", "meist"]);
  assert.equal(s.search, true);
});

test("parseStruct verwirft unbekannte Rails und kaputtes kitchrome", () => {
  const s = parseStruct("kitstruct=" + encodeURIComponent("shell=portal&rails=neueste,boese") + "; kitchrome=%7Bkaputt");
  assert.deepEqual(s.rails, ["neueste"]);
  assert.equal(s.nav, null);
});

test("effectiveCookie: persönlicher Cookie schlägt globale Struktur", () => {
  const g = { kitstruct: "shell%3Dportal", kitchrome: "%7B%22brand%22%3A%22G%22%7D" };
  // ohne persönliche Cookies → global greift
  assert.match(effectiveCookie("", g), /kitstruct=shell%3Dportal/);
  // mit persönlichem kitstruct → globaler Wert wird NICHT angehängt
  const merged = effectiveCookie("kitstruct=" + encodeURIComponent("shell=single"), g);
  assert.equal((merged.match(/kitstruct=/g) || []).length, 1);
  assert.match(merged, /kitchrome=/); // fehlendes kitchrome kommt weiterhin aus global
});

test("parseStruct: kitpins wird gelesen, je Scope auf 3 gedeckelt", () => {
  const val = encodeURIComponent(JSON.stringify({ "/": ["g1", "g2", "g3", "g4"], "rubrik/politik": ["a"] }));
  const s = parseStruct("kitpins=" + val);
  assert.deepEqual(s.pins["/"], ["g1", "g2", "g3"]);
  assert.deepEqual(s.pins["rubrik/politik"], ["a"]);
});

test("parseStruct: ohne kitpins ist pins eine leere Map", () => {
  assert.deepEqual(parseStruct("").pins, {});
});

test("parseStruct: defektes kitpins → leere Map", () => {
  assert.deepEqual(parseStruct("kitpins=%7Bkaputt").pins, {});
});

test("effectiveCookie: globales kitpins greift ohne persönlichen Cookie", () => {
  const g = { kitpins: encodeURIComponent(JSON.stringify({ "/": ["g1"] })) };
  assert.match(effectiveCookie("", g), /kitpins=/);
  const merged = effectiveCookie("kitpins=" + encodeURIComponent(JSON.stringify({ "/": ["x"] })), g);
  assert.equal((merged.match(/kitpins=/g) || []).length, 1); // persönlich gewinnt
});

test("buildPageContext: kitpins-Cookie erzwingt no-store", async () => {
  const ctx = { env: {}, request: new Request("https://example.com/", { headers: { cookie: "kitpins=%7B%7D" } }) };
  const { cacheControl } = await buildPageContext(/** @type {any} */ (ctx));
  assert.equal(cacheControl, "no-store");
});
