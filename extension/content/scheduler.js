export function yieldToMainThread() {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 50 });
      return;
    }

    window.setTimeout(resolve, 0);
  });
}
