import { test } from "node:test";
import assert from "node:assert/strict";
import { autoTitle, list, MAX, remove, rename, save, type Discussion } from "./discussions.ts";

const mem = (init: Record<string, string> = {}) => ({
  data: init,
  getItem(k: string) { return this.data[k] ?? null; },
  setItem(k: string, v: string) { this.data[k] = v; },
});
const idea = (label: string) => ({ id: label, label, kind: "idea" as const, createdAt: 0 });
const d = (id: string, updatedAt: number, extra: Partial<Discussion> = {}): Discussion => ({
  id, title: id, updatedAt, board: { nodes: [], edges: [] }, lines: [], ...extra,
});

test("save upserts, lists newest first, and caps the count", () => {
  const s = mem();
  save(d("a", 1), s);
  save(d("b", 2), s);
  save(d("a", 3), s);
  assert.deepEqual(list(s).map((x) => x.id), ["a", "b"]);
  for (let i = 0; i < MAX + 5; i++) save(d(`x${i}`, 10 + i), s);
  assert.equal(list(s).length, MAX);
  assert.equal(list(s)[0].id, `x${MAX + 4}`);
});

test("rename sticks across later autosaves; blank rename is ignored", () => {
  const s = mem();
  save(d("a", 1, { title: "auto" }), s);
  rename("a", "  ", s);
  assert.equal(list(s)[0].title, "auto");
  rename("a", "Pricing", s);
  save(d("a", 2, { title: "auto again" }), s);
  assert.equal(list(s)[0].title, "Pricing");
});

test("remove deletes; snapshots are not stored", () => {
  const s = mem();
  save(d("a", 1, { board: { nodes: [{ ...idea("x"), snapshot: "data:image/png;base64,AAAA" }], edges: [] } }), s);
  assert.equal(list(s)[0].board.nodes[0].snapshot, undefined);
  remove("a", s);
  assert.deepEqual(list(s), []);
});

test("bad or blocked storage reads as empty and never throws", () => {
  assert.deepEqual(list(mem({ discussions: "{not json" })), []);
  assert.deepEqual(list(mem({ discussions: '[{"id":1},null,"x"]' })), []);
  const blocked = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } };
  assert.deepEqual(list(blocked), []);
  assert.doesNotThrow(() => save(d("a", 1), blocked));
  assert.deepEqual(list(undefined), []);
});

test("autoTitle uses the first idea", () => {
  assert.equal(autoTitle({ nodes: [], edges: [] }), "Untitled discussion");
  assert.equal(autoTitle({ nodes: [{ ...idea("Q3"), kind: "fact" }, idea("Pricing")], edges: [] }), "Pricing");
});
