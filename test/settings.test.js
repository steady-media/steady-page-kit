// test/settings.test.js — Struktur-Cookie-Parsing + Präzedenz persönlich > global.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStruct, effectiveCookie } from "../functions/_lib/settings.ts";

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
