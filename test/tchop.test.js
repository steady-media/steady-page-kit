import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeComment, makeStubClient, normalizeReactions } from "../functions/_lib/tchop.ts";

const RAW = {
  id: 765086,
  content: "🐕 musste gerade Fährten verfolgen",
  createdAt: "2025-10-27T21:43:18.000Z",
  isHighlighted: true,
  parentId: null,
  reactions: [{ name: "like", count: 1 }, { name: "love", count: 2 }],
  author: {
    id: 458041, screenName: "Sebastian",
    email: "newsletter@blaupause.community",
    position: "Blaupause-Autor", roleId: "ORGANISATION_ADMIN",
    location: { text: "Berlin" },
    links: { linkedin: "https://linkedin.com/in/x" },
    avatar: { thumb: "https://cdn/x.jpg", url: "https://cdn/big.jpg" },
  },
};

test("normalizeComment keeps only safe fields and sums reactions", () => {
  const c = normalizeComment(RAW);
  assert.equal(c.id, 765086);
  assert.equal(c.author.name, "Sebastian");
  assert.equal(c.author.avatar, "https://cdn/x.jpg");
  assert.equal(c.text, "🐕 musste gerade Fährten verfolgen");
  assert.equal(c.highlighted, true);
  assert.equal(c.reactions, 3);
  const json = JSON.stringify(c);
  for (const leak of ["email", "newsletter@blaupause", "Berlin", "roleId", "linkedin", "position"]) {
    assert.ok(!json.includes(leak), `leaked: ${leak}`);
  }
});

test("stub client returns a configured engagement with threaded comments", async () => {
  const eng = await makeStubClient().getEngagement("https://steady.page/x/posts/abc");
  assert.equal(eng.hasCard, true);
  assert.ok(eng.deepLink.startsWith("https://"));
  assert.ok(eng.commentCount >= 1);
  assert.ok(Array.isArray(eng.comments[0].replies));
  // per-type reaction breakdown for the emoji strip
  assert.ok(Array.isArray(eng.reactionTypes) && eng.reactionTypes.length >= 1);
  assert.equal(eng.reactions, eng.reactionTypes.reduce((s, r) => s + r.count, 0));
});

test("normalizeReactions keeps count>0 types in canonical order and totals them", () => {
  const out = normalizeReactions([
    { name: "love", count: 4 }, { name: "like", count: 2 },
    { name: "haha", count: 0 }, { name: "angry", count: 1 },
  ]);
  assert.equal(out.total, 7);
  assert.deepEqual(out.types.map(t => t.name), ["like", "love", "angry"]); // canonical order, zeros dropped
  assert.equal(normalizeReactions(null).total, 0);
  assert.deepEqual(normalizeReactions(undefined).types, []);
});
