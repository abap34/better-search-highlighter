import { MAX_MATCHES, SCAN_YIELD_EVERY } from "../shared/constants.js";
import { findLiteralRanges } from "../shared/literal-search.js";
import { collectTextNodes } from "./dom-scanner.js";
import { yieldToMainThread } from "./scheduler.js";

const LEVEL_CLASSES = ["bsh-level-1", "bsh-level-2", "bsh-level-3", "bsh-level-4"];

export class SpanHighlighter {
  constructor(styleManager) {
    this.styleManager = styleManager;
    this.matches = [];
    this.spans = [];
    this.nextId = 1;
  }

  async search(query, settings, shouldContinue = () => true) {
    this.clear();

    const canStart = shouldContinue();
    if (!query || !canStart) {
      return { matches: [], truncated: false, scanStats: null, cancelled: !canStart };
    }

    const scanLimits = settings.searchAllContent
      ? {
          maxTextNodes: Infinity,
          maxTextChars: Infinity,
          maxFrameDocuments: Infinity
        }
      : {};
    const maxMatches = settings.searchAllContent ? Infinity : MAX_MATCHES;
    const scan = await collectTextNodes(document, { ...scanLimits, shouldContinue });
    if (scan.stats.cancelled || !shouldContinue()) {
      return { matches: [], truncated: false, scanStats: scan.stats, cancelled: true };
    }

    const textNodes = scan.nodes;
    const matches = [];
    let truncated = scan.limited;

    for (let nodeIndex = 0; nodeIndex < textNodes.length; nodeIndex += 1) {
      if (!shouldContinue()) {
        this.clear();
        return { matches: [], truncated: false, scanStats: scan.stats, cancelled: true };
      }
      if (nodeIndex > 0 && nodeIndex % SCAN_YIELD_EVERY === 0) {
        await yieldToMainThread();
        if (!shouldContinue()) {
          this.clear();
          return { matches: [], truncated: false, scanStats: scan.stats, cancelled: true };
        }
      }

      const textNode = textNodes[nodeIndex];
      const remaining = maxMatches - matches.length;
      if (remaining <= 0) {
        truncated = true;
        break;
      }

      const result = findLiteralRanges(textNode.nodeValue, query, remaining);
      if (result.ranges.length === 0) {
        continue;
      }

      this.styleManager.ensureDocument(textNode.ownerDocument);
      const created = this.wrapTextNode(textNode, result.ranges, query);
      matches.push(...created);
      this.spans.push(...created.map((match) => match.element));

      if (result.truncated || matches.length >= maxMatches) {
        truncated = true;
        break;
      }
    }

    this.matches = matches.map((match, index) => ({ ...match, index }));
    return { matches: this.matches, truncated, scanStats: scan.stats, cancelled: false };
  }

  clear() {
    if (this.spans.length === 0) {
      this.matches = [];
      return;
    }

    const parents = new Set();
    for (const span of this.spans) {
      const parent = span.parentNode;
      if (!parent) {
        continue;
      }

      parents.add(parent);
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    }

    for (const parent of parents) {
      parent.normalize();
    }

    this.matches = [];
    this.spans = [];
  }

  applyState({ currentIndex, level, blinkEnabled }) {
    for (const match of this.matches) {
      const span = match.element;
      span.classList.remove(
        "bsh-match-current",
        "bsh-match-other",
        "bsh-blink-enabled",
        ...LEVEL_CLASSES
      );
      span.classList.add(`bsh-level-${level}`);

      if (match.index === currentIndex) {
        span.classList.add("bsh-match-current");
        if (level === 3 && blinkEnabled) {
          span.classList.add("bsh-blink-enabled");
        }
      } else {
        span.classList.add("bsh-match-other");
      }
    }
  }

  wrapTextNode(textNode, ranges, query) {
    const createdByStart = new Map();
    let workingNode = textNode;

    for (const range of [...ranges].reverse()) {
      const afterNode = workingNode.splitText(range.end);
      const matchTextNode = workingNode.splitText(range.start);
      const span = textNode.ownerDocument.createElement("span");
      const id = `bsh-${this.nextId.toString(36)}`;
      this.nextId += 1;
      span.className = "bsh-match bsh-match-other";
      span.dataset.bshMatchId = id;

      afterNode.parentNode.insertBefore(span, afterNode);
      span.appendChild(matchTextNode);
      createdByStart.set(range.start, { span, range, id });
    }

    return ranges.map((range) => {
      const created = createdByStart.get(range.start);
      const domRange = textNode.ownerDocument.createRange();
      domRange.selectNodeContents(created.span);
      return {
        id: created.id,
        text: query,
        range: domRange,
        startOffset: range.start,
        endOffset: range.end,
        index: -1,
        element: created.span,
        doc: textNode.ownerDocument,
        win: textNode.ownerDocument.defaultView
      };
    });
  }
}
