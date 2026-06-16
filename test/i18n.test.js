// test/i18n.test.js — key parity de↔en (the most important i18n test: if a key is
// missing in one language, the UI silently falls back to German), interpolation, date.
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
      // object arrays (looks): check the shape of the entries
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

test("i18n: de and en have exactly the same keys (incl. client + catalog lengths)", () => {
  const all = _allStrings();
  assert.deepEqual(keyPaths(all.en), keyPaths(all.de));
});

test("i18n: t() interpolates and falls back cleanly", () => {
  const tDe = makeT("de"), tEn = makeT("en");
  assert.equal(tDe("read.min", { min: 5 }), "5 Min Lesezeit");
  assert.equal(tEn("read.min", { min: 5 }), "5 min read");
  assert.equal(tEn("landing.desc", { name: "Acme" }), "Latest posts from Acme");
  assert.equal(tDe("does.not.exist"), "does.not.exist"); // unknown key → the key itself
  assert.equal(makeT("fr")("skip"), "Zum Inhalt springen"); // unknown language → de
});

test("i18n: LOCALES provide html/og/intl for both languages", () => {
  assert.deepEqual(LOCALES.de, { html: "de", og: "de_DE", intl: "de-DE" });
  assert.deepEqual(LOCALES.en, { html: "en", og: "en_US", intl: "en-US" });
});

test("i18n: clientStrings contains the browser subset", () => {
  const c = clientStrings("en");
  assert.equal(c["admin.fail"], "Wrong or missing admin code.");
  assert.equal(c.palettes.length, 5);
  assert.equal(c.pairs.length, 15);
  assert.equal(c.looks.length, 7);
});

test("fmtDate: locale-aware (Intl), UTC-stable", () => {
  const pub = "Mon, 17 Mar 2025 08:00:00 +0000";
  assert.equal(fmtDate(pub, "de-DE"), "17. März 2025");
  assert.equal(fmtDate(pub, "en-US"), "March 17, 2025");
  assert.equal(fmtDate("not a date"), "");
});
