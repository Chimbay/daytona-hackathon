import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdits, emptyBoard, factEdits } from "./board.ts";
import { summarize } from "./summary.ts";

test("summary nests ideas by edges, shows was-trail, facts and transcript", () => {
  let b = applyEdits(emptyBoard, [
    { op: "add", node: { id: "a", label: "Launch app", kind: "idea", speaker: "Maya" } },
    { op: "add", node: { id: "b", label: "Web first", kind: "idea" } },
    { op: "link", from: "a", to: "b" },
    { op: "add", node: { id: "q", label: "How is Q3?", kind: "question" } },
    { op: "link", from: "a", to: "q" },
  ], 1);
  b = applyEdits(b, [{ op: "supersede", id: "b", node: { id: "c", label: "Mobile first", kind: "idea" } }], 2);
  b = applyEdits(b, factEdits("q", "Q3 up 12%", "https://wiki/q3"), 3);
  const md = summarize(b, [{ speaker: "Maya", text: "Let's launch" }]);
  assert.match(md, /^# Launch app\n/);
  assert.match(md, /- Launch app \(Maya\)\n {2}- Mobile first \(was: Web first\)\n {2}- Q: How is Q3\?\n {4}- Fact: Q3 up 12% \[source\]\(https:\/\/wiki\/q3\)/);
  assert.match(md, /## Facts\n- Q3 up 12% — https:\/\/wiki\/q3/);
  assert.match(md, /- \*\*Maya:\*\* Let's launch/);
  assert.doesNotMatch(md, /- Web first/);
});

test("empty board still produces a summary", () => {
  assert.match(summarize(emptyBoard, []), /# Brainstorm/);
});
