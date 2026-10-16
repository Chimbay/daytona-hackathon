import { test } from "node:test";
import assert from "node:assert/strict";
import { APIConnectionTimeoutError } from "@anthropic-ai/sdk";
import { isTimeout, parseJson, upstreamError } from "./errors.ts";

test("parseJson returns undefined instead of throwing", () => {
  assert.deepEqual(parseJson('{"edits":[]}'), { edits: [] });
  assert.equal(parseJson('{"edits":[{"op":"add"'), undefined); // truncated at max_tokens
  assert.equal(parseJson(""), undefined);
  assert.equal(parseJson(undefined), undefined);
});

test("upstreamError maps timeouts to 504 and hides the upstream message", async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const t = upstreamError("board model", new APIConnectionTimeoutError());
    assert.equal(t.status, 504);
    assert.deepEqual(await t.json(), { error: "board model timed out" });
    assert.ok(isTimeout(new DOMException("x", "TimeoutError")));
    const f = upstreamError("Agent Memory", new Error("401: secret upstream body"));
    assert.equal(f.status, 502);
    assert.deepEqual(await f.json(), { error: "Agent Memory failed" });
  } finally {
    console.error = quiet;
  }
});
