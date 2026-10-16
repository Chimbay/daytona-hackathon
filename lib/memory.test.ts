import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChains, toTriples, type IdeaVersion } from "./memory.ts";

test("supersede becomes old→new relation with time plus the new node's provenance", () => {
  const t = toTriples("s1", [
    { op: "supersede", id: "free-tier", node: { id: "trial", label: "30-day trial", kind: "idea", speaker: "Maya", quote: "trial instead" } },
  ], "board-agent", "2026-10-16T12:00:00.000Z");
  const rel = t.find((x) => x.key === "superseded_by");
  assert.deepEqual(rel, {
    entity: { type: "concept", name: "s1:free-tier" },
    key: "superseded_by",
    target: { type: "concept", name: "s1:trial" },
    valid_from: "2026-10-16T12:00:00.000Z",
  });
  assert.ok(t.some((x) => x.entity.name === "s1:trial" && x.key === "quote" && x.value === "trial instead"));
  assert.ok(t.some((x) => x.entity.name === "s1:free-tier" && x.key === "status" && x.value === "superseded"));
});

test("chains follow supersede relations oldest first", () => {
  const v = (id: string, createdAt: string): IdeaVersion => ({ id, label: id, createdAt, labelHistory: [] });
  const chains = buildChains([v("c", "3"), v("a", "1"), v("b", "2"), v("x", "0")], [
    { from: "b", to: "c", at: "3" },
    { from: "a", to: "b", at: "2" },
  ]);
  assert.deepEqual(chains.map((c) => c.map((i) => i.id)), [["x"], ["a", "b", "c"]]);
  assert.deepEqual(chains[1][0].supersededBy, { id: "b", at: "2" });
});
