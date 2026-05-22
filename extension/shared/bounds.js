export function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.min(Math.max(number, min), Math.max(min, max));
}

export function clampInteger(value, min, max) {
  return Math.round(clampNumber(value, min, max));
}
