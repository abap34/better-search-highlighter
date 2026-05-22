import { MAX_MATCHES } from "./constants.js";

export function findLiteralRanges(text, query, limit = MAX_MATCHES) {
  if (typeof text !== "string" || typeof query !== "string" || query.length === 0) {
    return { ranges: [], truncated: false };
  }

  const safeLimit = limit === Infinity
    ? Infinity
    : Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : MAX_MATCHES;
  const ranges = [];
  let fromIndex = 0;

  while (fromIndex <= text.length) {
    const start = text.indexOf(query, fromIndex);
    if (start === -1) {
      return { ranges, truncated: false };
    }

    if (ranges.length >= safeLimit) {
      return { ranges, truncated: true };
    }

    const end = start + query.length;
    ranges.push({ start, end });
    fromIndex = end;
  }

  return { ranges, truncated: false };
}
