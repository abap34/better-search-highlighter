import { MUTATION_DEBOUNCE_MS, MUTATION_MIN_INTERVAL_MS } from "../shared/constants.js";

export class PageObserver {
  constructor(onChange) {
    this.onChange = onChange;
    this.observer = null;
    this.pauseCount = 0;
    this.timer = null;
    this.lastChangeAt = 0;
  }

  start() {
    if (this.observer || !document.documentElement) {
      return;
    }

    this.observer = new MutationObserver((records) => this.handle(records));
    this.observer.observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async pauseWhile(callback) {
    this.pauseCount += 1;
    try {
      return await callback();
    } finally {
      this.pauseCount -= 1;
    }
  }

  handle(records) {
    if (this.pauseCount > 0 || records.every((record) => isInternalRecord(record))) {
      return;
    }

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
    }

    const now = performance.now();
    const elapsed = now - this.lastChangeAt;
    const delay = Math.max(
      MUTATION_DEBOUNCE_MS,
      MUTATION_MIN_INTERVAL_MS - Math.max(0, elapsed)
    );

    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.lastChangeAt = performance.now();
      this.onChange();
    }, delay);
  }
}

function isInternalRecord(record) {
  if (isInternalNode(record.target)) {
    return true;
  }

  const changedNodes = [...record.addedNodes, ...record.removedNodes];
  return changedNodes.length > 0 && changedNodes.every((node) => isInternalNode(node));
}

function isInternalNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return isInternalNode(node.parentNode);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  return Boolean(
    node.dataset?.bshRoot === "true" ||
      node.classList?.contains("bsh-match") ||
      node.closest?.('[data-bsh-root="true"], .bsh-match')
  );
}
