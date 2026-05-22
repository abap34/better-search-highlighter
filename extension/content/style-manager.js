const STYLE_ID = "better-search-highlight-style";

export class StyleManager {
  constructor() {
    this.documents = new Set();
  }

  ensureDocument(doc) {
    if (!doc?.documentElement) {
      return;
    }

    this.documents.add(doc);
    let style = doc.getElementById(STYLE_ID);
    if (!style) {
      style = doc.createElement("style");
      style.id = STYLE_ID;
      style.dataset.bshRoot = "true";
      doc.documentElement.appendChild(style);
    }

    style.textContent = createDocumentCss();
  }
}

export function createDocumentCss() {
  return `
.bsh-match,
.bsh-dimmer {
  --bsh-level-1-current-bg: #f9a825;
  --bsh-level-1-other-bg: #fff176;
  --bsh-level-2-current-bg: #e60000;
  --bsh-level-2-current-fg: #ffffff;
  --bsh-level-2-other-bg: rgba(230, 0, 0, 0.28);
  --bsh-current-outline: #ffffff;
  --bsh-current-shadow: rgba(230, 0, 0, 0.55);
  --bsh-dim-bg: rgba(0, 0, 0, 0.68);
}

.bsh-match {
  border-radius: 2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.bsh-match-current {
  position: relative;
  z-index: 2147483646;
}

.bsh-match.bsh-level-1.bsh-match-other {
  background: var(--bsh-level-1-other-bg);
  color: inherit;
}

.bsh-match.bsh-level-1.bsh-match-current {
  background: var(--bsh-level-1-current-bg);
  color: #000000;
}

.bsh-match.bsh-level-2.bsh-match-other,
.bsh-match.bsh-level-3.bsh-match-other,
.bsh-match.bsh-level-4.bsh-match-other {
  background: var(--bsh-level-2-other-bg);
  color: inherit;
}

.bsh-match.bsh-level-2.bsh-match-current,
.bsh-match.bsh-level-3.bsh-match-current,
.bsh-match.bsh-level-4.bsh-match-current {
  background: var(--bsh-level-2-current-bg);
  color: var(--bsh-level-2-current-fg);
  outline: 2px solid var(--bsh-current-outline);
  box-shadow: 0 0 0 3px var(--bsh-current-shadow);
}

.bsh-match.bsh-level-3.bsh-match-current.bsh-blink-enabled {
  animation: bsh-current-blink 900ms steps(2, start) infinite;
}

.bsh-dimmer {
  position: fixed;
  pointer-events: none;
  z-index: 2147483645;
  border: 2px solid rgba(255, 255, 255, 0.94);
  border-radius: 4px;
  box-shadow: 0 0 0 9999px var(--bsh-dim-bg), 0 0 18px rgba(255, 255, 255, 0.45);
  box-sizing: border-box;
}

@keyframes bsh-current-blink {
  0%, 100% {
    filter: brightness(1.18);
    box-shadow: 0 0 0 3px var(--bsh-current-shadow), 0 0 14px rgba(230, 0, 0, 0.72);
  }
  50% {
    filter: brightness(0.58);
    box-shadow: 0 0 0 3px rgba(230, 0, 0, 0.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bsh-match.bsh-level-3.bsh-match-current.bsh-blink-enabled {
    animation: none !important;
  }
}

`;
}

export function createPanelCss() {
  return `
:host {
  --bsh-panel-bg: #ffffff;
  --bsh-panel-fg: #111111;
  --bsh-panel-border: rgba(0, 0, 0, 0.18);
  --bsh-panel-muted: rgba(17, 17, 17, 0.62);
  --bsh-panel-accent: #d00000;
  color-scheme: light;
  all: initial;
}

.bsh-panel {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(180px, 260px) auto auto auto auto;
  row-gap: 6px;
  column-gap: 4px;
  align-items: center;
  min-width: 430px;
  max-width: min(560px, calc(100vw - 24px));
  padding: 8px;
  border: 1px solid var(--bsh-panel-border);
  border-radius: 8px;
  background: var(--bsh-panel-bg);
  color: var(--bsh-panel-fg);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
  font: 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.drag {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
  cursor: grab;
  user-select: none;
}

.title {
  font-weight: 700;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--bsh-panel-muted);
  font-variant-numeric: tabular-nums;
}

.jump {
  box-sizing: border-box;
  width: 42px;
  min-height: 24px;
  padding: 0 5px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--bsh-panel-fg);
  font: inherit;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.jump:enabled:hover,
.jump:enabled:focus {
  border-color: var(--bsh-panel-border);
  background: #ffffff;
  outline: none;
}

.jump:disabled {
  color: var(--bsh-panel-muted);
}

.jump::-webkit-outer-spin-button,
.jump::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

input[data-role="query"] {
  box-sizing: border-box;
  width: 100%;
  min-height: 32px;
  padding: 0 9px;
  border: 1px solid var(--bsh-panel-border);
  border-radius: 6px;
  background: #ffffff;
  color: #111111;
  font: inherit;
}

button {
  box-sizing: border-box;
  min-width: 34px;
  min-height: 32px;
  padding: 0 9px;
  border: 1px solid var(--bsh-panel-border);
  border-radius: 6px;
  background: #ffffff;
  color: #111111;
  font: inherit;
  cursor: pointer;
}

.icon-button {
  display: inline-grid;
  place-items: center;
  width: 34px;
  padding: 0;
}

.icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}

button:hover {
  border-color: rgba(208, 0, 0, 0.6);
}

.level {
  min-width: 34px;
  text-align: center;
  color: var(--bsh-panel-accent);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.settings {
  grid-column: 1 / -1;
  min-width: 0;
  border-top: 1px solid color-mix(in srgb, var(--bsh-panel-fg) 10%, transparent);
  padding-top: 6px;
  color: var(--bsh-panel-muted);
  line-height: 1.4;
}

.settings summary {
  cursor: pointer;
  color: var(--bsh-panel-fg);
  font-weight: 700;
  user-select: none;
}

.setting-row {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin: 8px 12px 0 0;
  color: var(--bsh-panel-fg);
  font-weight: 650;
  user-select: none;
}

.setting-row select {
  min-height: 28px;
  border: 1px solid var(--bsh-panel-border);
  border-radius: 6px;
  background: #ffffff;
  color: #111111;
  font: inherit;
}

.setting-help,
.setting-warning {
  margin: 6px 0 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.setting-warning {
  color: #9f1239;
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}

.settings-actions button {
  min-height: 28px;
  font-size: 12px;
}

button.danger {
  border-color: rgba(159, 18, 57, 0.6);
  color: #9f1239;
}

.message {
  grid-column: 1 / -1;
  min-height: 16px;
  color: var(--bsh-panel-muted);
  font-size: 12px;
}

@media (max-width: 520px) {
  .bsh-panel {
    grid-template-columns: 1fr auto auto;
    min-width: min(360px, calc(100vw - 24px));
  }

  .level {
    grid-column: span 1;
  }
}

`;
}
