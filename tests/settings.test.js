import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_HIGHLIGHT_LEVEL,
  SETTINGS_STORAGE_KEY,
  coerceSelectableHighlightLevel,
  loadSettings,
  normalizeSettings,
  patchSettings,
  resetSettings,
  saveSettings,
  stepHighlightLevel
} from "../extension/shared/settings.js";

test("normalizeSettings repairs invalid values", () => {
  assert.deepEqual(
    normalizeSettings({
      version: 999,
      highlightLevel: 99,
      blinkEnabled: "yes",
      searchAllContent: "yes",
      language: "fr",
      panelPosition: { x: -10, y: 13.4 }
    }),
    {
      version: 1,
      highlightLevel: DEFAULT_HIGHLIGHT_LEVEL,
      blinkEnabled: true,
      searchAllContent: false,
      language: "auto",
      panelPosition: { x: 0, y: 13 }
    }
  );
});

test("normalizeSettings starts with blink disabled for reduced motion users", () => {
  assert.equal(normalizeSettings(null, { reducedMotion: true }).blinkEnabled, false);
});

test("normalizeSettings preserves explicit blink choice for reduced motion users", () => {
  assert.equal(
    normalizeSettings({ blinkEnabled: true }, { reducedMotion: true }).blinkEnabled,
    true
  );
});

test("normalizeSettings preserves explicit search-all-content choice", () => {
  assert.equal(normalizeSettings({ searchAllContent: true }).searchAllContent, true);
  assert.equal(normalizeSettings({ searchAllContent: false }).searchAllContent, false);
});

test("normalizeSettings preserves supported language choices", () => {
  assert.equal(normalizeSettings({ language: "auto" }).language, "auto");
  assert.equal(normalizeSettings({ language: "en" }).language, "en");
  assert.equal(normalizeSettings({ language: "ja" }).language, "ja");
});

test("highlight stepping skips level 3 when blinking is disabled", () => {
  assert.equal(stepHighlightLevel(2, 1, false), 4);
  assert.equal(stepHighlightLevel(4, -1, false), 2);
  assert.equal(coerceSelectableHighlightLevel(3, false), 2);
});

test("highlight stepping stays within selectable bounds", () => {
  assert.equal(stepHighlightLevel(1, -1, true), 1);
  assert.equal(stepHighlightLevel(4, 1, true), 4);
  assert.equal(stepHighlightLevel(2, 0, true), 2);
});

test("patchSettings merges with existing storage safely", async () => {
  const chrome = createMemoryChrome({
    [SETTINGS_STORAGE_KEY]: {
      version: 1,
      highlightLevel: 4,
      blinkEnabled: true,
      language: "ja",
      panelPosition: null
    }
  });

  await patchSettings({ blinkEnabled: false }, chrome);
  const loaded = await loadSettings(chrome);

  assert.equal(loaded.highlightLevel, 4);
  assert.equal(loaded.blinkEnabled, false);
});

test("saveSettings normalizes before writing to storage", async () => {
  const chrome = createMemoryChrome();

  const saved = await saveSettings(
    {
      highlightLevel: 999,
      blinkEnabled: true,
      searchAllContent: true,
      language: "en",
      panelPosition: { x: -5, y: 7.8 }
    },
    chrome
  );

  assert.equal(saved.highlightLevel, DEFAULT_HIGHLIGHT_LEVEL);
  assert.equal(saved.searchAllContent, true);
  assert.equal(saved.language, "en");
  assert.deepEqual(saved.panelPosition, { x: 0, y: 8 });
  assert.equal(chrome.dump()[SETTINGS_STORAGE_KEY].highlightLevel, DEFAULT_HIGHLIGHT_LEVEL);
});

test("resetSettings removes stored settings and returns defaults", async () => {
  const chrome = createMemoryChrome({
    [SETTINGS_STORAGE_KEY]: {
      version: 1,
      highlightLevel: 4,
      blinkEnabled: false,
      searchAllContent: true,
      language: "ja",
      panelPosition: { x: 10, y: 20 }
    }
  });

  const reset = await resetSettings(chrome);

  assert.equal(reset.highlightLevel, DEFAULT_HIGHLIGHT_LEVEL);
  assert.equal(reset.blinkEnabled, true);
  assert.equal(reset.searchAllContent, false);
  assert.equal(reset.language, "auto");
  assert.equal(chrome.dump()[SETTINGS_STORAGE_KEY], undefined);
});

function createMemoryChrome(initial = {}) {
  const store = { ...initial };
  return {
    dump() {
      return { ...store };
    },
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(values) {
          Object.assign(store, values);
        },
        async remove(key) {
          delete store[key];
        }
      }
    }
  };
}
