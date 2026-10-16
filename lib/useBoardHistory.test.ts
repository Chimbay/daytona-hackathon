import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyBoard, applyEdits } from "./board.ts";
import { describe } from "./useBoardHistory.ts";

test("replay labels name what changed", () => {
  const b = applyEdits(emptyBoard, [{ op: "add", node: { id: "a", label: "Hire sales reps", kind: "idea" } }], 1);
  assert.equal(describe(emptyBoard, [{ op: "add", node: { id: "a", label: "Hire sales reps", kind: "idea" } }]), "+ Hire sales reps");
  assert.equal(describe(b, [{ op: "supersede", id: "a", node: { id: "b", label: "Self-serve onboarding", kind: "idea" } }]), "Hire sales reps → Self-serve onboarding");
  assert.equal(
    describe(b, [{ op: "add", node: { id: "f", label: "Q3 revenue", kind: "fact" } }, { op: "link", from: "a", to: "f" }, { op: "remove", id: "a" }]),
    "📌 Q3 revenue (+1 more)",
  );
  assert.equal(describe(b, [{ op: "link", from: "a", to: "a" }]), "Linked ideas");
});
