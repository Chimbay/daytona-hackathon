import { test } from "node:test";
import assert from "node:assert/strict";
import { pick } from "./research.ts";

const pages = [{ href: "https://w/q3.html", title: "Q3", text: "Q3 revenue $4.2M" }];

test("pick keeps the fact and takes the source from the page read, not the model", () => {
  assert.deepEqual(pick({ page: 0, fact: " Q3 revenue $4.2M " }, pages), { fact: "Q3 revenue $4.2M", source: "https://w/q3.html" });
});

test("pick returns null for no answer or out-of-range pages", () => {
  assert.equal(pick({ page: -1, fact: "" }, pages), null);
  assert.equal(pick({ page: 3, fact: "x" }, pages), null);
  assert.equal(pick({ page: 0, fact: "  " }, pages), null);
  assert.equal(pick(null, pages), null);
});
