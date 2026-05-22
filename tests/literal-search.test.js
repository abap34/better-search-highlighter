import assert from "node:assert/strict";
import test from "node:test";

import { findLiteralRanges } from "../extension/shared/literal-search.js";

test("findLiteralRanges returns literal, case-sensitive matches", () => {
  const result = findLiteralRanges("Find find FIND find", "find");

  assert.deepEqual(result, {
    ranges: [
      { start: 5, end: 9 },
      { start: 15, end: 19 }
    ],
    truncated: false
  });
});

test("findLiteralRanges treats regular expression syntax as text", () => {
  const result = findLiteralRanges("a.b axb a.b", "a.b");

  assert.deepEqual(result.ranges, [
    { start: 0, end: 3 },
    { start: 8, end: 11 }
  ]);
});

test("findLiteralRanges enforces match limit", () => {
  const result = findLiteralRanges("aaaa", "a", 2);

  assert.deepEqual(result.ranges, [
    { start: 0, end: 1 },
    { start: 1, end: 2 }
  ]);
  assert.equal(result.truncated, true);
});

test("findLiteralRanges supports unlimited matches", () => {
  const result = findLiteralRanges("aaaa", "a", Infinity);

  assert.deepEqual(result.ranges, [
    { start: 0, end: 1 },
    { start: 1, end: 2 },
    { start: 2, end: 3 },
    { start: 3, end: 4 }
  ]);
  assert.equal(result.truncated, false);
});

test("findLiteralRanges does not return overlapping matches", () => {
  const result = findLiteralRanges("aaaa", "aa");

  assert.deepEqual(result.ranges, [
    { start: 0, end: 2 },
    { start: 2, end: 4 }
  ]);
});
