// Protokoll-Stabilität: Schema-Werte sind Schnittstelle, keine Texte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStruct } from "../functions/_lib/settings.ts";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("Cookie-Schema: parseStruct versteht die kanonischen Enum-Werte", () => {
  const s = parseStruct("kitstruct=" + encodeURIComponent("shell=portal&auf=gross&stream=rubrik&header=zentriert&search=1&rails=neueste,meist,themen"));
  assert.equal(s.shell, "portal");
  assert.equal(s.auf, "gross");
  assert.equal(s.stream, "rubrik");
  assert.equal(s.headerStyle, "zentriert");
  assert.deepEqual(s.rails, ["neueste", "meist", "themen"]);
});

test("KV-Keys und Admin-Header sind unverändert im Quelltext verankert", () => {
  const api = read("functions/api/config.ts") + read("functions/api/logo.ts") + read("functions/api/react.ts");
  for (const key of ['"config"', '"config:prev"', '"logo:data"', '"logo:meta"', '"react:"']) {
    assert.ok(api.includes(key), `KV-Key ${key} fehlt`);
  }
  assert.ok(read("functions/_lib/auth.ts").includes("x-kit-admin"));
});

test("Client-Schema: localStorage-Keys + Enum-Kataloge unverändert", () => {
  const theme = read("public/assets/kit-theme.js");
  for (const token of ["kitFontHead", "kitColors", "schmal", "standard", "breit",
                       "kompakt", "komfortabel", "grosszuegig", "eckig", "rund",
                       "farbe", "duotone", "graustufen"]) {
    assert.ok(theme.includes(token), `kit-theme.js: "${token}" fehlt`);
  }
  const panel = read("functions/_lib/panel.ts");
  for (const attr of ["data-fn", "data-kind", "data-v"]) assert.ok(panel.includes(attr));
});

test("URL-Schema: /rubrik/-Prefix existiert als Route", () => {
  assert.ok(read("server/routes.ts").includes("/rubrik/"));
});
