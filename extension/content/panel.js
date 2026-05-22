import { createPanelCss } from "./style-manager.js";
import { clampNumber } from "../shared/bounds.js";
import { productName, t } from "../shared/i18n.js";

export class SearchPanel {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.host = document.createElement("div");
    this.host.id = "better-search-highlight-root";
    this.host.dataset.bshRoot = "true";
    this.host.style.position = "fixed";
    this.host.style.top = "16px";
    this.host.style.right = "16px";
    this.host.style.zIndex = "2147483647";
    this.host.style.display = "none";
    this.host.hidden = true;
    this.notice = "";

    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = this.renderMarkup("");
    document.documentElement.appendChild(this.host);

    this.refs = {
      style: this.shadow.querySelector("style"),
      panel: this.shadow.querySelector(".bsh-panel"),
      drag: this.shadow.querySelector(".drag"),
      input: this.shadow.querySelector('[data-role="query"]'),
      prev: this.shadow.querySelector('[data-action="prev"]'),
      next: this.shadow.querySelector('[data-action="next"]'),
      close: this.shadow.querySelector('[data-action="close"]'),
      level: this.shadow.querySelector(".level"),
      blink: this.shadow.querySelector('[data-setting="blink"]'),
      searchAllContent: this.shadow.querySelector('[data-setting="search-all-content"]'),
      language: this.shadow.querySelector('[data-setting="language"]'),
      resetLevel: this.shadow.querySelector('[data-action="reset-level"]'),
      resetPanel: this.shadow.querySelector('[data-action="reset-panel"]'),
      resetSettings: this.shadow.querySelector('[data-action="reset-settings"]'),
      openShortcuts: this.shadow.querySelector('[data-action="open-shortcuts"]'),
      status: this.shadow.querySelector(".status"),
      jump: this.shadow.querySelector(".jump"),
      message: this.shadow.querySelector(".message")
    };

    this.bindEvents();
  }

  renderMarkup() {
    const name = productName();
    return `
      <style>${createPanelCss()}</style>
      <section class="bsh-panel" role="dialog" aria-label="${name}">
        <div class="drag">
          <span class="title">${name}</span>
          <span class="status" aria-live="polite">
            <input class="jump" type="number" min="1" inputmode="numeric" aria-label="${t("panelJumpLabel", undefined, "Jump to match number")}" disabled>
            <span class="total">/ 0</span>
          </span>
        </div>
        <input type="text" data-role="query" aria-label="${t("panelSearchLabel", undefined, "Search text")}" autocomplete="off" spellcheck="false">
        <button type="button" data-action="prev" class="icon-button" aria-label="${t("panelPreviousMatch", undefined, "Previous match")}">${chevronIcon("up")}</button>
        <button type="button" data-action="next" class="icon-button" aria-label="${t("panelNextMatch", undefined, "Next match")}">${chevronIcon("down")}</button>
        <span class="level" aria-live="polite">L2</span>
        <button type="button" data-action="close" aria-label="${t("panelCloseSearch", undefined, "Close search")}">${t("panelCloseButton", undefined, "x")}</button>
        <details class="settings">
          <summary data-i18n="panelSettingsSummary">${t("panelSettingsSummary", undefined, "Settings")}</summary>
          <label class="setting-row">
            <span data-i18n="panelLanguageLabel">${t("panelLanguageLabel", undefined, "Language")}</span>
            <select data-setting="language" aria-label="${t("panelLanguageLabel", undefined, "Language")}">
              <option value="auto" data-i18n="panelLanguageAuto">${t("panelLanguageAuto", undefined, "Auto")}</option>
              <option value="en" data-i18n="panelLanguageEnglish">${t("panelLanguageEnglish", undefined, "English")}</option>
              <option value="ja" data-i18n="panelLanguageJapanese">${t("panelLanguageJapanese", undefined, "Japanese")}</option>
            </select>
          </label>
          <label class="setting-row">
            <input type="checkbox" data-setting="blink" aria-label="${t("panelAllowBlinking", undefined, "Allow blinking highlight")}">
            <span data-i18n="panelBlinkLabel">${t("panelBlinkLabel", undefined, "Blink")}</span>
          </label>
          <p class="setting-help" data-i18n="panelSearchScopeHelp">${t("panelSearchScopeHelp", undefined, "To avoid performance impact on dynamically generated or very large pages, Better Search Highlighter limits how much text it loads. Enable Search all content when you want to search the entire page.")}</p>
          <label class="setting-row">
            <input type="checkbox" data-setting="search-all-content" aria-label="${t("panelSearchAllContent", undefined, "Search all content")}">
            <span data-i18n="panelSearchAllContent">${t("panelSearchAllContent", undefined, "Search all content")}</span>
          </label>
          <p class="setting-warning" data-i18n="panelSearchAllContentWarning">${t("panelSearchAllContentWarning", undefined, "Warning: this searches the page without content-size limits and may affect performance on some pages.")}</p>
          <div class="settings-actions">
            <button type="button" data-action="reset-level" data-i18n="panelResetLevel">${t("panelResetLevel", undefined, "Reset level")}</button>
            <button type="button" data-action="reset-panel" data-i18n="panelResetPanel">${t("panelResetPanel", undefined, "Reset panel")}</button>
            <button type="button" data-action="open-shortcuts" data-i18n="panelOpenShortcuts">${t("panelOpenShortcuts", undefined, "Shortcuts")}</button>
            <button type="button" data-action="reset-settings" class="danger" data-i18n="panelResetSettings">${t("panelResetSettings", undefined, "Reset settings")}</button>
          </div>
        </details>
        <div class="message" aria-live="polite"></div>
      </section>
    `;
  }

  bindEvents() {
    this.refs.input.addEventListener("input", () => {
      this.callbacks.onInput(this.refs.input.value);
    });

    this.shadow.addEventListener("keydown", (event) => this.handleKeydown(event), true);
    this.shadow.addEventListener("keyup", (event) => this.handleEscape(event), true);
    this.refs.input.addEventListener("keydown", (event) => this.handleEscape(event), true);
    this.refs.input.addEventListener("keyup", (event) => this.handleEscape(event), true);
    this.refs.jump.addEventListener("keydown", (event) => this.handleEscape(event), true);
    this.refs.jump.addEventListener("keyup", (event) => this.handleEscape(event), true);

    this.refs.prev.addEventListener("click", () => this.callbacks.onNavigate(-1));
    this.refs.next.addEventListener("click", () => this.callbacks.onNavigate(1));
    this.refs.close.addEventListener("click", () => this.callbacks.onClose());
    this.refs.jump.addEventListener("keydown", (event) => this.handleJumpKeydown(event));
    this.refs.blink.addEventListener("change", () => {
      this.callbacks.onBlinkChange(this.refs.blink.checked);
    });
    this.refs.searchAllContent.addEventListener("change", () => {
      this.callbacks.onSearchAllContentChange(this.refs.searchAllContent.checked);
    });
    this.refs.language.addEventListener("change", () => {
      this.callbacks.onLanguageChange(this.refs.language.value);
    });
    this.refs.resetLevel.addEventListener("click", () => this.callbacks.onResetLevel());
    this.refs.resetPanel.addEventListener("click", () => this.callbacks.onResetPanelPosition());
    this.refs.resetSettings.addEventListener("click", () => this.callbacks.onResetSettings());
    this.refs.openShortcuts.addEventListener("click", () => this.callbacks.onOpenShortcuts());

    this.refs.drag.addEventListener("pointerdown", (event) => this.startDrag(event));
  }

  handleKeydown(event) {
    if (this.handleEscape(event)) {
      return;
    }

    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const target = event.target;
    const isSearchField = target === this.refs.input || target === this.refs.jump;
    if (!isSearchField) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.callbacks.onNavigate(event.shiftKey ? -1 : 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.callbacks.onLevelStep(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.callbacks.onLevelStep(-1);
    }
  }

  handleJumpKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.callbacks.onJump(Number.parseInt(this.refs.jump.value, 10));
    }
  }

  handleEscape(event) {
    if (!isEscapeEvent(event)) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    this.callbacks.onClose();
    return true;
  }

  open(position) {
    this.host.hidden = false;
    this.host.style.display = "block";
    if (position) {
      this.applyPosition(position);
    } else {
      this.host.style.left = "auto";
      this.host.style.top = "16px";
      this.host.style.right = "16px";
    }
  }

  close() {
    this.host.style.display = "none";
    this.host.hidden = true;
  }

  resetPosition() {
    this.host.style.left = "auto";
    this.host.style.top = "16px";
    this.host.style.right = "16px";
  }

  focus() {
    window.setTimeout(() => {
      this.refs.input.focus();
      this.refs.input.select();
    }, 0);
  }

  setQuery(query) {
    this.refs.input.value = query;
  }

  setSettings(settings) {
    this.refs.level.textContent = `L${settings.highlightLevel}`;
    this.refs.blink.checked = settings.blinkEnabled;
    this.refs.searchAllContent.checked = settings.searchAllContent;
    this.refs.language.value = settings.language;
    this.refs.style.textContent = createPanelCss();
    this.updateLanguage();
  }

  updateResults({ currentIndex, total, truncated, scanStats }) {
    const current = total === 0 || currentIndex < 0 ? 0 : currentIndex + 1;
    this.refs.jump.disabled = total === 0;
    this.refs.jump.max = String(Math.max(1, total));
    if (document.activeElement !== this.refs.jump) {
      this.refs.jump.value = total === 0 ? "" : String(current);
    }
    this.refs.status.querySelector(".total").textContent = `/ ${total}`;
    this.refs.message.textContent = createStatusMessage(truncated, scanStats) || this.notice;
  }

  setNotice(message) {
    const previous = this.notice;
    this.notice = message;
    if (!this.refs.message.textContent || this.refs.message.textContent === previous) {
      this.refs.message.textContent = message;
    }
  }

  updateLanguage() {
    this.shadow.querySelector(".title").textContent = productName();
    this.refs.input.setAttribute("aria-label", t("panelSearchLabel", undefined, "Search text"));
    this.refs.jump.setAttribute("aria-label", t("panelJumpLabel", undefined, "Jump to match number"));
    this.refs.prev.setAttribute("aria-label", t("panelPreviousMatch", undefined, "Previous match"));
    this.refs.next.setAttribute("aria-label", t("panelNextMatch", undefined, "Next match"));
    this.refs.close.setAttribute("aria-label", t("panelCloseSearch", undefined, "Close search"));
    this.refs.close.textContent = t("panelCloseButton", undefined, "x");
    this.refs.blink.setAttribute("aria-label", t("panelAllowBlinking", undefined, "Allow blinking highlight"));
    this.refs.searchAllContent.setAttribute("aria-label", t("panelSearchAllContent", undefined, "Search all content"));
    this.refs.language.setAttribute("aria-label", t("panelLanguageLabel", undefined, "Language"));

    for (const element of this.shadow.querySelectorAll("[data-i18n]")) {
      element.textContent = t(element.dataset.i18n, undefined, element.textContent);
    }
  }

  startDrag(event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.refs.drag.setPointerCapture(event.pointerId);
    const rect = this.host.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const move = (moveEvent) => {
      const x = clampNumber(moveEvent.clientX - offsetX, 8, window.innerWidth - rect.width - 8);
      const y = clampNumber(moveEvent.clientY - offsetY, 8, window.innerHeight - rect.height - 8);
      this.applyPosition({ x, y });
    };

    const up = (upEvent) => {
      this.refs.drag.releasePointerCapture(upEvent.pointerId);
      this.refs.drag.removeEventListener("pointermove", move);
      this.refs.drag.removeEventListener("pointerup", up);
      const finalRect = this.host.getBoundingClientRect();
      this.callbacks.onPanelPositionChange({
        x: Math.round(finalRect.left),
        y: Math.round(finalRect.top)
      });
    };

    this.refs.drag.addEventListener("pointermove", move);
    this.refs.drag.addEventListener("pointerup", up);
  }

  applyPosition(position) {
    this.host.style.right = "auto";
    this.host.style.left = `${clampNumber(position.x, 8, window.innerWidth - 24)}px`;
    this.host.style.top = `${clampNumber(position.y, 8, window.innerHeight - 24)}px`;
  }
}

function createStatusMessage(truncated, scanStats) {
  if (!truncated) {
    return "";
  }
  if (scanStats?.limitedByTextChars) {
    return `${t("statusTextSafetyLimit", undefined, "Search stopped at the page text safety limit.")} ${t("statusSearchAllContentHint", undefined, "Enable Search all content to search without this limit.")}`;
  }
  if (scanStats?.limitedByTextNodes) {
    return `${t("statusNodeSafetyLimit", undefined, "Search stopped at the DOM node safety limit.")} ${t("statusSearchAllContentHint", undefined, "Enable Search all content to search without this limit.")}`;
  }
  if (scanStats?.limitedByFrames) {
    return `${t("statusFrameSafetyLimit", undefined, "Search skipped some frames for safety.")} ${t("statusSearchAllContentHint", undefined, "Enable Search all content to search without this limit.")}`;
  }
  return `${t("statusMatchSafetyLimit", undefined, "Too many matches. Results were limited for performance.")} ${t("statusSearchAllContentHint", undefined, "Enable Search all content to search without this limit.")}`;
}

function chevronIcon(direction) {
  const path = direction === "up" ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6";
  return `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="${path}"></path>
    </svg>
  `;
}

function isEscapeEvent(event) {
  return event.key === "Escape" || event.key === "Esc" || event.code === "Escape" || event.keyCode === 27;
}
