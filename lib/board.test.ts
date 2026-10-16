import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdits, emptyBoard, replaced, visibleNodes } from "./board.ts";

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

test("replaced walks the supersede chain newest first", () => {
  let b = applyEdits(emptyBoard, [{ op: "add", node: idea("a", "free tier") }]);
  b = applyEdits(b, [{ op: "supersede", id: "a", node: idea("b", "trial") }]);
  b = applyEdits(b, [{ op: "supersede", id: "b", node: idea("c", "30-day trial") }]);
  assert.deepEqual(replaced(b, "c"), ["trial", "free tier"]);
  assert.deepEqual(replaced(b, "a"), []);
});

test("clipScript matches the recorded clip's text and builds the expected board", async () => {
  const { readFileSync } = await import("node:fs");
  const { clipScript } = await import("./demo-script.ts");
  const spoken = clipScript.filter((s) => s.speaker !== "Board").map((s) => `${s.speaker}: ${s.text}`);
  assert.deepEqual(spoken, readFileSync("public/demo/brainstorm.txt", "utf8").trim().split("\n"));
  const b = clipScript.reduce((b, s, i) => applyEdits(b, s.edits, i), emptyBoard);
  assert.deepEqual(visibleNodes(b).map((n) => n.id).sort(), ["fact-q3", "goal", "q-q3", "referral", "self-serve"]);
  assert.deepEqual(replaced(b, "self-serve"), ["Hire two more sales reps"]);
});
