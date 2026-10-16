import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdits, emptyBoard, visibleNodes } from "./board.ts";

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
