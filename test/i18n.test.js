// test/i18n.test.js — Key-Parität de↔en (der wichtigste i18n-Test: fehlt ein Key
// in einer Sprache, fällt die UI still auf Deutsch zurück), Interpolation, Datum.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeT, LOCALES, clientStrings, _allStrings } from "../functions/_lib/i18n.ts";
import { fmtDate } from "../functions/_lib/util.ts";

function keyPaths(obj, prefix = "") {
  const out = [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (Array.isArray(v)) {
      out.push(`${prefix}${k}[len=${v.length}]`);
      // Objekt-Arrays (looks): Form der Einträge prüfen
      v.forEach((e, i) => {
        if (e && typeof e === "object") out.push(...keyPaths(e, `${prefix}${k}[${i}].`));
      });
    } else if (v && typeof v === "object") {
      out.push(...keyPaths(v, `${prefix}${k}.`));
    } else {
      out.push(prefix + k);
    }
  }
  return out.sort();
}

test("i18n: de und en haben exakt dieselben Keys (inkl. client + Katalog-Längen)", () => {
  const all = _allStrings();
  assert.deepEqual(keyPaths(all.en), keyPaths(all.de));
});

test("i18n: t() interpoliert und fällt sauber zurück", () => {
  const tDe = makeT("de"), tEn = makeT("en");
  assert.equal(tDe("read.min", { min: 5 }), "5 Min Lesezeit");
  assert.equal(tEn("read.min", { min: 5 }), "5 min read");
  assert.equal(tEn("landing.desc", { name: "Acme" }), "Latest posts from Acme");
  assert.equal(tDe("gibt.es.nicht"), "gibt.es.nicht"); // unbekannter Key → Key selbst
  assert.equal(makeT("fr")("skip"), "Zum Inhalt springen"); // unbekannte Sprache → de
});

test("i18n: LOCALES liefern html/og/intl für beide Sprachen", () => {
  assert.deepEqual(LOCALES.de, { html: "de", og: "de_DE", intl: "de-DE" });
  assert.deepEqual(LOCALES.en, { html: "en", og: "en_US", intl: "en-US" });
});

test("i18n: clientStrings enthält die Browser-Teilmenge", () => {
  const c = clientStrings("en");
  assert.equal(c["admin.fail"], "Wrong or missing admin code.");
  assert.equal(c.palettes.length, 5);
  assert.equal(c.pairs.length, 15);
  assert.equal(c.looks.length, 7);
});

test("fmtDate: locale-bewusst (Intl), UTC-stabil", () => {
  const pub = "Mon, 17 Mar 2025 08:00:00 +0000";
  assert.equal(fmtDate(pub, "de-DE"), "17. März 2025");
  assert.equal(fmtDate(pub, "en-US"), "March 17, 2025");
  assert.equal(fmtDate("kein datum"), "");
});
