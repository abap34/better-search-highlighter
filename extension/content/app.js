import {
  DEFAULT_HIGHLIGHT_LEVEL,
  coerceSelectableHighlightLevel,
  loadSettings,
  patchSettings,
  resetSettings,
  stepHighlightLevel
} from "../shared/settings.js";
import { MESSAGE_TYPES } from "../shared/constants.js";
import { setLanguagePreference, t } from "../shared/i18n.js";
import { SpanHighlighter } from "./highlighter.js";
import { StyleManager } from "./style-manager.js";
import { SearchPanel } from "./panel.js";
import { SpotlightDimmer } from "./dimmer.js";
import { PageObserver } from "./page-observer.js";

export async function createBetterSearchHighlightApp() {
  const reducedMotion = isReducedMotion();
  const settings = await loadSettings(chrome, { reducedMotion });
  setLanguagePreference(settings.language);
  return new BetterSearchHighlightApp(settings, reducedMotion);
}

class BetterSearchHighlightApp {
  constructor(settings, reducedMotion) {
    this.reducedMotion = reducedMotion;
    this.settings = {
      ...settings,
      highlightLevel: coerceSelectableHighlightLevel(
        settings.highlightLevel,
        settings.blinkEnabled
      )
    };
    this.styleManager = new StyleManager();
    this.highlighter = new SpanHighlighter(this.styleManager);
    this.dimmer = new SpotlightDimmer(this.styleManager);
    this.observer = new PageObserver(() => this.refreshAfterPageMutation());
    this.query = "";
    this.matches = [];
    this.currentIndex = -1;
    this.searchTimer = null;
    this.active = false;
    this.searchInFlight = false;
    this.pendingSearchOptions = null;
    this.boundGlobalEscape = (event) => this.handleGlobalEscape(event);

    this.panel = new SearchPanel({
      onInput: (query) => this.scheduleSearch(query),
      onNavigate: (direction) => this.navigate(direction),
      onJump: (index) => this.jumpTo(index),
      onLevelStep: (direction) => void this.stepLevel(direction),
      onBlinkChange: (enabled) => void this.setBlinkEnabled(enabled),
      onSearchAllContentChange: (enabled) => void this.setSearchAllContent(enabled),
      onLanguageChange: (language) => void this.setLanguage(language),
      onResetLevel: () => void this.resetLevel(),
      onResetPanelPosition: () => void this.resetPanelPosition(),
      onResetSettings: () => void this.resetAllSettings(),
      onOpenShortcuts: () => void this.openShortcuts(),
      onClose: () => this.close(),
      onPanelPositionChange: (position) => void this.savePanelPosition(position)
    });
    this.panel.setSettings(this.settings);
  }

  open() {
    this.active = true;
    window.addEventListener("keydown", this.boundGlobalEscape, true);
    window.addEventListener("keyup", this.boundGlobalEscape, true);
    document.addEventListener("keydown", this.boundGlobalEscape, true);
    document.addEventListener("keyup", this.boundGlobalEscape, true);
    this.panel.open(this.settings.panelPosition);
    this.panel.focus();
    this.observer.start();
    this.updatePanel();
    void this.checkShortcutAssignment();
  }

  close() {
    this.active = false;
    window.removeEventListener("keydown", this.boundGlobalEscape, true);
    window.removeEventListener("keyup", this.boundGlobalEscape, true);
    document.removeEventListener("keydown", this.boundGlobalEscape, true);
    document.removeEventListener("keyup", this.boundGlobalEscape, true);
    this.pendingSearchOptions = null;
    this.cancelScheduledSearch();
    this.observer.stop();
    this.observer.pauseWhile(() => {
      this.highlighter.clear();
      this.dimmer.clear();
    });
    this.matches = [];
    this.currentIndex = -1;
    this.query = "";
    this.panel.setQuery("");
    this.panel.close();
  }

  handleGlobalEscape(event) {
    if (!this.active || !isEscapeEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this.close();
  }

  scheduleSearch(query) {
    this.query = query;
    this.cancelScheduledSearch();
    this.searchTimer = window.setTimeout(() => {
      this.searchTimer = null;
      void this.runSearch({ preserveIndex: false, scroll: true });
    }, 90);
  }

  cancelScheduledSearch() {
    if (this.searchTimer !== null) {
      window.clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  async runSearch(options = {}) {
    if (this.searchInFlight) {
      this.pendingSearchOptions = {
        preserveIndex: Boolean(options.preserveIndex),
        scroll: Boolean(options.scroll)
      };
      return;
    }

    this.searchInFlight = true;
    try {
      await this.performSearch(options);
    } finally {
      this.searchInFlight = false;
      if (this.active && this.pendingSearchOptions) {
        const pending = this.pendingSearchOptions;
        this.pendingSearchOptions = null;
        await this.runSearch(pending);
      }
    }
  }

  async performSearch(options = {}) {
    const preserveIndex = Boolean(options.preserveIndex);
    const shouldScroll = Boolean(options.scroll);
    const oldIndex = this.currentIndex;
    const query = this.query;

    await this.observer.pauseWhile(async () => {
      this.highlighter.clear();
      this.dimmer.clear();

      if (!this.active || query.length === 0) {
        this.matches = [];
        this.currentIndex = -1;
        this.updatePanel();
        return;
      }

      const isCurrentSearch = () => this.active && query === this.query;
      const result = await this.highlighter.search(query, this.settings, isCurrentSearch);
      if (result.cancelled || !isCurrentSearch()) {
        this.highlighter.clear();
        this.dimmer.clear();
        return;
      }

      this.matches = result.matches;
      this.currentIndex = this.resolveCurrentIndex(preserveIndex ? oldIndex : 0);
      this.applyVisualState({ scroll: shouldScroll });
      this.updatePanel(result.truncated, result.scanStats);
    });
  }

  refreshAfterPageMutation() {
    if (this.query.length === 0) {
      return;
    }
    void this.runSearch({ preserveIndex: true, scroll: false });
  }

  navigate(direction) {
    if (this.matches.length === 0) {
      return;
    }

    const next = this.currentIndex + direction;
    this.currentIndex = (next + this.matches.length) % this.matches.length;
    this.applyVisualState({ scroll: true });
    this.updatePanel();
  }

  jumpTo(oneBasedIndex) {
    if (this.matches.length === 0 || !Number.isInteger(oneBasedIndex)) {
      return;
    }

    const nextIndex = Math.min(Math.max(oneBasedIndex, 1), this.matches.length) - 1;
    this.currentIndex = nextIndex;
    this.applyVisualState({ scroll: true });
    this.updatePanel();
  }

  async stepLevel(direction) {
    const nextLevel = stepHighlightLevel(
      this.settings.highlightLevel,
      direction,
      this.settings.blinkEnabled
    );
    await this.setSettings({ highlightLevel: nextLevel });
    this.applyVisualState({ scroll: false });
    this.updatePanel();
  }

  async setBlinkEnabled(enabled) {
    const nextLevel = coerceSelectableHighlightLevel(this.settings.highlightLevel, enabled);
    await this.setSettings({
      blinkEnabled: enabled,
      highlightLevel: nextLevel
    });
    this.applyVisualState({ scroll: false });
    this.updatePanel();
  }

  async setSearchAllContent(enabled) {
    await this.setSettings({ searchAllContent: enabled });
    if (this.query.length > 0) {
      await this.runSearch({ preserveIndex: true, scroll: false });
    }
  }

  async setLanguage(language) {
    await this.setSettings({ language });
    this.updatePanel();
  }

  async savePanelPosition(position) {
    await this.setSettings({ panelPosition: position }, { applyToPanel: false });
  }

  async resetLevel() {
    await this.setSettings({ highlightLevel: DEFAULT_HIGHLIGHT_LEVEL });
    this.applyVisualState({ scroll: false });
    this.updatePanel();
    this.panel.setNotice(t("statusLevelReset", undefined, "Highlight level reset."));
  }

  async resetPanelPosition() {
    await this.setSettings({ panelPosition: null }, { applyToPanel: false });
    this.panel.resetPosition();
    this.panel.setNotice(t("statusPanelReset", undefined, "Panel position reset."));
  }

  async resetAllSettings() {
    const previousSearchAllContent = this.settings.searchAllContent;
    this.settings = await resetSettings(chrome, { reducedMotion: this.reducedMotion });
    setLanguagePreference(this.settings.language);
    this.settings.highlightLevel = coerceSelectableHighlightLevel(
      this.settings.highlightLevel,
      this.settings.blinkEnabled
    );
    this.panel.resetPosition();
    this.panel.setSettings(this.settings);
    this.applyVisualState({ scroll: false });
    this.updatePanel();
    this.panel.setNotice(t("statusAllReset", undefined, "All settings reset."));

    if (this.query.length > 0 && previousSearchAllContent !== this.settings.searchAllContent) {
      await this.runSearch({ preserveIndex: true, scroll: false });
    }
  }

  async openShortcuts() {
    try {
      const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SHORTCUTS });
      if (!response?.ok) {
        throw new Error(response?.error || "Failed to open shortcuts");
      }
    } catch {
      this.panel.setNotice(t(
        "statusOpenShortcutsManually",
        undefined,
        "Open chrome://extensions/shortcuts manually."
      ));
    }
  }

  async setSettings(patch, options = {}) {
    const applyToPanel = options.applyToPanel !== false;
    this.settings = await patchSettings(
      {
        ...this.settings,
        ...patch
      },
      chrome,
      { reducedMotion: this.reducedMotion }
    );
    this.settings.highlightLevel = coerceSelectableHighlightLevel(
      this.settings.highlightLevel,
      this.settings.blinkEnabled
    );
    setLanguagePreference(this.settings.language);
    if (applyToPanel) {
      this.panel.setSettings(this.settings);
    }
  }

  resolveCurrentIndex(index) {
    if (this.matches.length === 0) {
      return -1;
    }
    if (!Number.isInteger(index) || index < 0) {
      return 0;
    }
    return Math.min(index, this.matches.length - 1);
  }

  applyVisualState(options = {}) {
    this.highlighter.applyState({
      currentIndex: this.currentIndex,
      level: this.settings.highlightLevel,
      blinkEnabled: this.settings.blinkEnabled
    });

    const currentMatch = this.matches[this.currentIndex] ?? null;
    this.dimmer.update(currentMatch, this.settings.highlightLevel);

    if (options.scroll && currentMatch) {
      currentMatch.element.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "auto"
      });
      this.dimmer.updatePosition();
    }
  }

  updatePanel(truncated = false, scanStats = null) {
    this.panel.setSettings(this.settings);
    this.panel.updateResults({
      currentIndex: this.currentIndex,
      total: this.matches.length,
      truncated,
      scanStats
    });
  }

  async checkShortcutAssignment() {
    try {
      const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_COMMANDS });
      if (!response?.ok) {
        return;
      }

      const command = response.commands?.find((item) => item.name === "_execute_action");
      this.panel.setNotice(command?.shortcut ? "" : t(
        "shortcutUnassignedNotice",
        undefined,
        "Shortcut is not assigned. Set it in Chrome shortcuts."
      ));
    } catch {
      // The panel remains usable through the action button and context menu.
    }
  }
}

function isReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isEscapeEvent(event) {
  return event.key === "Escape" || event.key === "Esc" || event.code === "Escape" || event.keyCode === 27;
}
