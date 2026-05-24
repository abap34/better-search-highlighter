import {
  MAX_FRAME_DOCUMENTS,
  MAX_TEXT_CHARS,
  MAX_TEXT_NODES,
  SCAN_YIELD_EVERY
} from "../shared/constants.js";
import { yieldToMainThread } from "./scheduler.js";

const SKIPPED_TAG_NAMES = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION"
]);

const VISUALLY_HIDDEN_CLASS_NAMES = new Set([
  "sr-only",
  "visually-hidden",
  "screen-reader-text"
]);

export async function collectTextNodes(rootDocument = document, limits = {}) {
  const scanLimits = {
    maxTextNodes: limits.maxTextNodes ?? MAX_TEXT_NODES,
    maxTextChars: limits.maxTextChars ?? MAX_TEXT_CHARS,
    maxFrameDocuments: limits.maxFrameDocuments ?? MAX_FRAME_DOCUMENTS,
    yieldEvery: limits.yieldEvery ?? SCAN_YIELD_EVERY,
    shouldContinue: limits.shouldContinue ?? (() => true)
  };
  const nodes = [];
  const visitedDocuments = new Set();
  const stats = {
    inspectedNodes: 0,
    textNodes: 0,
    textChars: 0,
    frameDocuments: 0,
    limitedByTextNodes: false,
    limitedByTextChars: false,
    limitedByFrames: false,
    cancelled: false
  };

  await collectFromDocument(rootDocument, nodes, visitedDocuments, stats, scanLimits);
  return {
    nodes,
    stats,
    limited:
      stats.limitedByTextNodes || stats.limitedByTextChars || stats.limitedByFrames
  };
}

async function collectFromDocument(doc, nodes, visitedDocuments, stats, limits) {
  if (!limits.shouldContinue()) {
    stats.cancelled = true;
    return;
  }

  if (!doc || visitedDocuments.has(doc)) {
    return;
  }

  if (visitedDocuments.size >= limits.maxFrameDocuments) {
    stats.limitedByFrames = true;
    return;
  }

  visitedDocuments.add(doc);
  stats.frameDocuments = visitedDocuments.size;

  const root = doc.body || doc.documentElement;
  if (!root) {
    return;
  }

  await collectFromRoot(root, doc, nodes, stats, limits);
  await collectSameOriginFrames(doc, nodes, visitedDocuments, stats, limits);
}

async function collectSameOriginFrames(doc, nodes, visitedDocuments, stats, limits) {
  for (const frame of doc.querySelectorAll("iframe")) {
    if (!limits.shouldContinue()) {
      stats.cancelled = true;
      return;
    }

    if (isAtLimit(stats, limits)) {
      return;
    }

    try {
      if (frame.contentDocument) {
        await collectFromDocument(frame.contentDocument, nodes, visitedDocuments, stats, limits);
      }
    } catch {
      // Cross-origin frames are intentionally skipped.
    }
  }
}

async function collectFromRoot(root, doc, nodes, stats, limits) {
  if (!limits.shouldContinue()) {
    stats.cancelled = true;
    return;
  }

  if (isAtLimit(stats, limits)) {
    return;
  }

  const filters = doc.defaultView?.NodeFilter ?? NodeFilter;
  const walker = doc.createTreeWalker(
    root,
    filters.SHOW_ELEMENT | filters.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return shouldSkipElement(node) ? filters.FILTER_REJECT : filters.FILTER_ACCEPT;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          return shouldAcceptTextNode(node) ? filters.FILTER_ACCEPT : filters.FILTER_REJECT;
        }

        return filters.FILTER_SKIP;
      }
    }
  );

  let node = walker.nextNode();
  while (node) {
    if (!limits.shouldContinue()) {
      stats.cancelled = true;
      return;
    }

    stats.inspectedNodes += 1;

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.nodeValue?.length ?? 0;
      if (nodes.length >= limits.maxTextNodes) {
        stats.limitedByTextNodes = true;
        return;
      }
      if (stats.textChars + length > limits.maxTextChars) {
        stats.limitedByTextChars = true;
        return;
      }
      nodes.push(node);
      stats.textNodes += 1;
      stats.textChars += length;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.shadowRoot) {
      await collectFromRoot(node.shadowRoot, doc, nodes, stats, limits);
      if (isAtLimit(stats, limits)) {
        return;
      }
    }

    if (stats.inspectedNodes % limits.yieldEvery === 0) {
      await yieldToMainThread();
      if (!limits.shouldContinue()) {
        stats.cancelled = true;
        return;
      }
    }

    node = walker.nextNode();
  }
}

function isAtLimit(stats, limits) {
  if (stats.textNodes >= limits.maxTextNodes) {
    stats.limitedByTextNodes = true;
    return true;
  }
  if (stats.textChars >= limits.maxTextChars) {
    stats.limitedByTextChars = true;
    return true;
  }
  return false;
}

function shouldAcceptTextNode(node) {
  if (!node.nodeValue || node.nodeValue.trim().length === 0) {
    return false;
  }

  const parent = node.parentElement;
  if (!parent || shouldSkipElement(parent)) {
    return false;
  }

  return isVisible(parent);
}

function shouldSkipElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return true;
  }

  if (element.dataset?.bshRoot === "true" || element.classList?.contains("bsh-match")) {
    return true;
  }

  if (element.closest?.('[data-bsh-root="true"], .bsh-match')) {
    return true;
  }

  if (SKIPPED_TAG_NAMES.has(element.tagName)) {
    return true;
  }

  if (
    element.isContentEditable ||
    element.hidden ||
    element.getAttribute("aria-hidden") === "true" ||
    isVisuallyHiddenElement(element)
  ) {
    return true;
  }

  return false;
}

function isVisuallyHiddenElement(element) {
  for (const className of VISUALLY_HIDDEN_CLASS_NAMES) {
    if (element.classList?.contains(className)) {
      return true;
    }
  }

  const view = element.ownerDocument.defaultView;
  if (!view) {
    return false;
  }

  const style = view.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const clipsContent =
    style.overflow === "hidden" ||
    style.overflowX === "hidden" ||
    style.overflowY === "hidden";
  const tinyBox = rect.width <= 1 && rect.height <= 1;
  const clipped = style.clip !== "auto" || style.clipPath !== "none";
  const removedFromFlow = style.position === "absolute" || style.position === "fixed";

  return tinyBox && clipsContent && (clipped || removedFromFlow);
}

function isVisible(element) {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    return true;
  }

  const style = view.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.visibility !== "collapse" &&
    style.opacity !== "0"
  );
}
