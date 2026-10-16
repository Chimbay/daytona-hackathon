import { test } from "node:test";
import assert from "node:assert/strict";
import { floatToPcm16 } from "./scribe.ts";

test("floatToPcm16 clamps and encodes little-endian 16-bit", () => {
  const out = new Int16Array(floatToPcm16(new Float32Array([0, 1, -1, 2, -2])).buffer);
  assert.deepEqual([...out], [0, 32767, -32768, 32767, -32768]);
});
