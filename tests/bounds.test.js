import assert from "node:assert/strict";
import test from "node:test";

import { clampInteger, clampNumber } from "../extension/shared/bounds.js";

test("clampNumber constrains finite values", () => {
  assert.equal(clampNumber(5, 0, 4), 4);
  assert.equal(clampNumber(-1, 0, 4), 0);
  assert.equal(clampNumber(3, 0, 4), 3);
});

test("clampNumber falls back to min for invalid values", () => {
  assert.equal(clampNumber(Number.NaN, 8, 20), 8);
});

test("clampInteger rounds after clamping", () => {
  assert.equal(clampInteger(3.6, 0, 10), 4);
});
