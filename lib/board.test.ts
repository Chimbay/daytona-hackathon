import { test } from "node:test";
import assert from "node:assert/strict";
import { activate, applyEdits, emptyBoard, looseIds, replaced, stacks, unseen, visibleNodes, type Board } from "./board.ts";

const idea = (id: string, label = id) => ({ id, label, kind: "idea" as const });

test("supersede hides the old node, keeps its history, and rewires edges", () => {
  let b = applyEdits(emptyBoard, [
    { op: "add", node: idea("a") },
    { op: "add", node: idea("b") },
    { op: "link", from: "a", to: "b" },
  ], 1);
  b = applyEdits(b, [{ op: "supersede", id: "b", node: idea("c") }], 2);

  assert.deepEqual(visibleNodes(b).map((n) => n.id), ["a", "c"]);
  assert.equal(b.nodes.find((n) => n.id === "b")?.supersededBy, "c");
  assert.deepEqual(b.edges, [{ from: "a", to: "c", label: undefined }]);
});

test("bad edits from the model are skipped", () => {
  const b = applyEdits(emptyBoard, [
    { op: "add", node: idea("a") },
    { op: "add", node: idea("a", "dup") },
    { op: "link", from: "a", to: "ghost" },
    { op: "link", from: "a", to: "a" },
    { op: "update", id: "ghost", label: "x" },
    { op: "supersede", id: "ghost", node: idea("z") },
  ]);
  assert.deepEqual(b.nodes.map((n) => [n.id, n.label]), [["a", "a"]]);
  assert.deepEqual(b.edges, []);
});

test("remove drops the node and its edges", () => {
  const b = applyEdits(emptyBoard, [
    { op: "add", node: idea("a") },
    { op: "add", node: idea("b") },
    { op: "link", from: "a", to: "b" },
    { op: "remove", id: "b" },
  ]);
  assert.deepEqual(b.nodes.map((n) => n.id), ["a"]);
  assert.deepEqual(b.edges, []);
});

test("old versions stack under the new card and can be switched back to", () => {
  // root -> b -> fact; b superseded by c; c then grows a branch c -> d -> e.
  let b = applyEdits(emptyBoard, [
    { op: "add", node: idea("root") },
    { op: "add", node: idea("b") },
    { op: "add", node: idea("fact") },
    { op: "link", from: "root", to: "b" },
    { op: "link", from: "b", to: "fact" },
  ]);
  b = applyEdits(b, [{ op: "supersede", id: "b", node: idea("c") }]);
  b = applyEdits(b, [
    { op: "add", node: idea("d") },
    { op: "add", node: idea("e") },
    { op: "link", from: "c", to: "d" },
    { op: "link", from: "d", to: "e" },
  ]);

  assert.deepEqual(stacks(b).map((s) => s.map((n) => n.id)), [["root"], ["fact"], ["c", "b"], ["d"], ["e"]]);

  // Going back to b: c's own branch (d, e) is parked; the fact b had comes back with b.
  const old = activate(b, "b");
  assert.deepEqual(stacks(old).map((s) => s.map((n) => n.id)).sort(), [["b", "c"], ["fact"], ["root"]]);
  assert.deepEqual(old.edges.map(key).sort(), ["b->fact", "root->b"]);

  // And forward again: c's branch reappears exactly as it was.
  const back = activate(old, "c");
  assert.deepEqual(visibleNodes(back).map((n) => n.id).sort(), ["c", "d", "e", "fact", "root"]);
  assert.deepEqual(back.edges.map(key).sort(), ["c->d", "c->fact", "d->e", "root->c"]);
});

const key = (e: { from: string; to: string }) => `${e.from}->${e.to}`;
const ids = (b: Board) => visibleNodes(b).map((n) => n.id).sort();

test("brainstorming continues on a revived version without touching other branches", () => {
  // Two independent branches off root: pricing (p1 -> p2) and marketing (m).
  let b = applyEdits(emptyBoard, [
    { op: "add", node: idea("root") },
    { op: "add", node: idea("p1") },
    { op: "add", node: idea("m") },
    { op: "link", from: "root", to: "p1" },
    { op: "link", from: "root", to: "m" },
  ], 1);
  b = applyEdits(b, [{ op: "supersede", id: "p1", node: idea("p2") }], 2);
  b = applyEdits(b, [{ op: "add", node: idea("p2-kid") }, { op: "link", from: "p2", to: "p2-kid" }], 2);

  // Revive p1 and keep going: new ideas, and even a newer version, build on p1.
  b = activate(b, "p1");
  b = applyEdits(b, [
    { op: "add", node: idea("p1-kid") },
    { op: "link", from: "p1", to: "p1-kid" },
    { op: "add", node: idea("m-kid") },
    { op: "link", from: "m", to: "m-kid" },
  ], 3);
  assert.deepEqual(ids(b), ["m", "m-kid", "p1", "p1-kid", "root"]);
  b = applyEdits(b, [{ op: "supersede", id: "p1", node: idea("p1b") }], 4);
  assert.deepEqual(stacks(b).find((s) => s[0].id === "p1b")!.map((n) => n.id), ["p1b", "p2", "p1"]);
  assert.deepEqual(b.edges.map(key).sort(), ["m->m-kid", "p1b->p1-kid", "root->m", "root->p1b"]);

  // Switch to the p2 line: p1b's branch parks, p2's comes back, marketing is untouched.
  b = activate(b, "p2");
  assert.deepEqual(ids(b), ["m", "m-kid", "p2", "p2-kid", "root"]);
  assert.deepEqual(b.edges.map(key).sort(), ["m->m-kid", "p2->p2-kid", "root->m", "root->p2"]);

  // And back to p1b with its own branch.
  b = activate(b, "p1b");
  assert.deepEqual(ids(b), ["m", "m-kid", "p1-kid", "p1b", "root"]);
});

test("edits aimed at a hidden branch keep growing it out of sight and are counted", () => {
  let b = applyEdits(emptyBoard, [
    { op: "add", node: idea("goal") },
    { op: "add", node: idea("free") },
    { op: "link", from: "goal", to: "free" },
  ], 1);
  b = applyEdits(b, [{ op: "supersede", id: "free", node: idea("trial") }], 2);
  b = activate(b, "free", 3); // user goes back while the room keeps talking about the trial

  b = applyEdits(b, [{ op: "add", node: idea("q") }, { op: "link", from: "trial", to: "q" }], 4);
  b = applyEdits(b, [{ op: "add", node: idea("fact") }, { op: "link", from: "q", to: "fact" }], 5);
  b = applyEdits(b, [{ op: "update", id: "q", label: "Q3?" }, { op: "supersede", id: "fact", node: idea("fact2") }], 6);

  assert.deepEqual(ids(b), ["free", "goal"]); // nothing floats loose
  const trial = b.nodes.find((n) => n.id === "trial")!;
  assert.equal(unseen(b, trial), 2); // q and fact2 (fact was replaced, not a new card)

  b = activate(b, "trial", 7);
  assert.deepEqual(ids(b), ["fact2", "goal", "q", "trial"]);
  assert.deepEqual(b.edges.map(key).sort(), ["goal->trial", "q->fact2", "trial->q"]);
  assert.equal(b.nodes.find((n) => n.id === "q")!.label, "Q3?");
  assert.deepEqual(stacks(b).find((s) => s[0].id === "fact2")!.map((n) => n.id), ["fact2", "fact"]);
  assert.equal(unseen(b, b.nodes.find((n) => n.id === "free")!), 0);
});

test("building on a replaced idea grows it out of sight without switching the view", () => {
  let b = applyEdits(emptyBoard, [
    { op: "add", node: idea("goal") },
    { op: "add", node: idea("free") },
    { op: "link", from: "goal", to: "free" },
  ], 1);
  b = applyEdits(b, [{ op: "supersede", id: "free", node: idea("trial") }], 2);
  const before = ids(b);

  // "For the free tier we could cap it at 5 seats": the brain links the new card from the hidden version.
  b = applyEdits(b, [{ op: "add", node: idea("cap") }, { op: "link", from: "free", to: "cap" }], 3);
  b = applyEdits(b, [{ op: "update", id: "free", label: "Free tier, small teams" }], 4);
  assert.deepEqual(ids(b), before);
  const [front, old] = stacks(b).find((s) => s[0].id === "trial")!;
  assert.equal(front.id, "trial");
  assert.equal(unseen(b, old), 1);

  // Only the user switches; then the card is there.
  b = activate(b, "free", 5);
  assert.deepEqual(ids(b), ["cap", "free", "goal"]);
});

test("unlinked ideas are loose until something links them; the topic never is", () => {
  let b = applyEdits(emptyBoard, [{ op: "add", node: idea("topic") }], 1);
  assert.deepEqual([...looseIds(b)], []);
  b = applyEdits(b, [{ op: "add", node: idea("stray") }, { op: "add", node: idea("other") }], 2);
  assert.deepEqual([...looseIds(b)].sort(), ["other", "stray"]);
  b = applyEdits(b, [{ op: "link", from: "topic", to: "stray" }, { op: "link", from: "other", to: "x" }], 3);
  assert.deepEqual([...looseIds(b)], ["other"]);
});

test("links from a revived version follow ideas that were superseded meanwhile", () => {
  let b = applyEdits(emptyBoard, [
    { op: "add", node: idea("root") },
    { op: "add", node: idea("a") },
    { op: "link", from: "root", to: "a" },
  ]);
  b = applyEdits(b, [{ op: "supersede", id: "a", node: idea("a2") }]);
  b = applyEdits(b, [{ op: "supersede", id: "root", node: idea("root2") }]);
  b = activate(b, "a");
  assert.deepEqual(b.edges.map(key), ["root2->a"]);
  assert.equal(activate(b, "ghost"), b);
  assert.equal(activate(b, "a"), b);
});

test("replaced walks the supersede chain newest first", () => {
  let b = applyEdits(emptyBoard, [{ op: "add", node: idea("a", "free tier") }]);
  b = applyEdits(b, [{ op: "supersede", id: "a", node: idea("b", "trial") }]);
  b = applyEdits(b, [{ op: "supersede", id: "b", node: idea("c", "30-day trial") }]);
  assert.deepEqual(replaced(b, "c"), ["trial", "free tier"]);
  assert.deepEqual(replaced(b, "a"), []);
});
