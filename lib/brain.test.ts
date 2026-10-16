import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./brain.ts";

test("validate keeps well-formed edits and drops malformed ones", () => {
  const r = validate({
    edits: [
      { op: "add", node: { id: "a", label: "A", kind: "idea", speaker: "Dev", quote: "a", extra: 1 } },
      { op: "add", node: { id: "b", label: "B", kind: "banana" } },
      { op: "supersede", id: "a", node: { id: "c", label: "C", kind: "idea" } },
      { op: "update", id: "a" },
      { op: "link", from: "a", to: "c", label: "" },
      { op: "nuke" },
      null,
    ],
    research: { question: "Q3?", nodeId: "" },
  });
  assert.deepEqual(r.edits, [
    { op: "add", node: { id: "a", label: "A", kind: "idea", speaker: "Dev", quote: "a" } },
    { op: "supersede", id: "a", node: { id: "c", label: "C", kind: "idea" } },
    { op: "link", from: "a", to: "c" },
  ]);
  assert.equal(r.research, undefined);
  assert.deepEqual(validate("garbage"), { edits: [], research: undefined });
});
