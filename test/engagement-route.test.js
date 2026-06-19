import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/engagement.ts";

const KEY = "https://steady.page/ab2d81e4/posts/49481338-16c5-4d18-9f2d-20b0821fe408";
const ctx = (url, env) => ({ request: new Request(url), env: env || {} });

test("rejects a missing/invalid key", async () => {
  const res = await onRequestGet(ctx("https://x/api/engagement"));
  assert.equal(res.status, 400);
});

test("no token configured → configured:false + fallback deepLink, public cache", async () => {
  const res = await onRequestGet(ctx("https://x/api/engagement?key=" + encodeURIComponent(KEY),
    { TCHOP_ORG: "steady", TCHOP_CHANNEL_ID: "290638", TCHOP_APP_URL: "https://sebastian-steady.tchop.io/webapp" }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.configured, false);
  assert.equal(body.deepLink, "https://sebastian-steady.tchop.io/webapp");
});

test("rejects a steady.page URL without a /posts/ segment", async () => {
  const res = await onRequestGet(ctx("https://x/api/engagement?key=" + encodeURIComponent("https://steady.page/ab2d81e4/about")));
  assert.equal(res.status, 400);
});

test("stub backend → configured:true with comments, short cache, no PII", async () => {
  const res = await onRequestGet(ctx("https://x/api/engagement?key=" + encodeURIComponent(KEY),
    { TCHOP_STUB: "1", TCHOP_ORG: "steady", TCHOP_CHANNEL_ID: "290638" }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") || "", /max-age=60/);
  const body = await res.json();
  assert.equal(body.configured, true);
  assert.ok(body.comments.length >= 1);
  assert.ok(Array.isArray(body.reactionTypes) && body.reactionTypes.length >= 1); // per-type breakdown for the emoji strip
  assert.ok(!JSON.stringify(body).includes("email"));
});

test("counts=1 → counts only, no thread or reaction breakdown (teaser indicator)", async () => {
  const res = await onRequestGet(ctx("https://x/api/engagement?counts=1&key=" + encodeURIComponent(KEY),
    { TCHOP_STUB: "1", TCHOP_ORG: "steady", TCHOP_CHANNEL_ID: "290638" }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.configured, true);
  assert.equal(typeof body.commentCount, "number");
  assert.equal(typeof body.reactions, "number"); // total still present
  assert.equal(body.comments, undefined);        // thread omitted in counts-only mode
  assert.equal(body.reactionTypes, undefined);   // breakdown omitted too
});
