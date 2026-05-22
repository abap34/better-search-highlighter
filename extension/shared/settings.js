import {
  DEFAULT_HIGHLIGHT_LEVEL,
  HIGHLIGHT_LEVELS
} from "./constants.js";
import { clampInteger } from "./bounds.js";

export { DEFAULT_HIGHLIGHT_LEVEL } from "./constants.js";

export const SETTINGS_VERSION = 1;
export const SETTINGS_STORAGE_KEY = "betterSearchHighlight.settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  version: SETTINGS_VERSION,
  highlightLevel: DEFAULT_HIGHLIGHT_LEVEL,
  blinkEnabled: true,
  searchAllContent: false,
  language: "auto",
  panelPosition: null
});

export function normalizeHighlightLevel(value) {
  return HIGHLIGHT_LEVELS.includes(value) ? value : DEFAULT_HIGHLIGHT_LEVEL;
}

export function normalizePanelPosition(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: clampInteger(x, 0, 100000),
    y: clampInteger(y, 0, 100000)
  };
}

export function normalizeLanguage(value) {
  return value === "auto" || value === "en" || value === "ja" ? value : DEFAULT_SETTINGS.language;
}

export function normalizeSettings(value, options = {}) {
  const reducedMotion = Boolean(options.reducedMotion);
  const source = value && typeof value === "object" ? value : {};

  return {
    version: SETTINGS_VERSION,
    highlightLevel: normalizeHighlightLevel(source.highlightLevel),
    blinkEnabled:
      typeof source.blinkEnabled === "boolean"
        ? source.blinkEnabled
        : !reducedMotion,
    searchAllContent:
      typeof source.searchAllContent === "boolean"
        ? source.searchAllContent
        : DEFAULT_SETTINGS.searchAllContent,
    language: normalizeLanguage(source.language),
    panelPosition: normalizePanelPosition(source.panelPosition)
  };
}

export function getSelectableHighlightLevels(blinkEnabled) {
  return blinkEnabled ? HIGHLIGHT_LEVELS : HIGHLIGHT_LEVELS.filter((level) => level !== 3);
}

export function coerceSelectableHighlightLevel(level, blinkEnabled) {
  const normalized = normalizeHighlightLevel(level);
  if (blinkEnabled || normalized !== 3) {
    return normalized;
  }
  return 2;
}

export function stepHighlightLevel(level, direction, blinkEnabled) {
  const levels = getSelectableHighlightLevels(blinkEnabled);
  const current = coerceSelectableHighlightLevel(level, blinkEnabled);
  const index = levels.indexOf(current);
  const fallbackIndex = levels.indexOf(DEFAULT_HIGHLIGHT_LEVEL);
  const safeIndex = index === -1 ? Math.max(0, fallbackIndex) : index;
  const nextIndex = Math.min(
    levels.length - 1,
    Math.max(0, safeIndex + Math.sign(direction))
  );
  return levels[nextIndex];
}

export async function loadSettings(chromeApi = globalThis.chrome, options = {}) {
  const area = getStorageArea(chromeApi);
  const stored = await area.get(SETTINGS_STORAGE_KEY);
  return normalizeSettings(stored[SETTINGS_STORAGE_KEY], options);
}

export async function saveSettings(settings, chromeApi = globalThis.chrome, options = {}) {
  const area = getStorageArea(chromeApi);
  const normalized = normalizeSettings(settings, options);
  await area.set({ [SETTINGS_STORAGE_KEY]: normalized });
  return normalized;
}

export async function patchSettings(patch, chromeApi = globalThis.chrome, options = {}) {
  const current = await loadSettings(chromeApi, options);
  return saveSettings({ ...current, ...patch }, chromeApi, options);
}

export async function resetSettings(chromeApi = globalThis.chrome, options = {}) {
  const area = getStorageArea(chromeApi);
  await area.remove(SETTINGS_STORAGE_KEY);
  return normalizeSettings(null, options);
}

function getStorageArea(chromeApi) {
  const area = chromeApi?.storage?.local;
  if (!area) {
    throw new Error("chrome.storage.local is not available");
  }
  return area;
}
