import { PRODUCT_NAME_FALLBACK } from "./constants.js";

const MESSAGES = Object.freeze({
  en: Object.freeze({
    extensionName: "Better Search Highlighter",
    panelSearchLabel: "Search text",
    panelPreviousMatch: "Previous match",
    panelNextMatch: "Next match",
    panelJumpLabel: "Jump to match number",
    panelCloseSearch: "Close search",
    panelCloseButton: "x",
    panelSettingsSummary: "Settings",
    panelLanguageLabel: "Language",
    panelLanguageAuto: "Auto",
    panelLanguageEnglish: "English",
    panelLanguageJapanese: "Japanese",
    panelAllowBlinking: "Allow blinking highlight",
    panelBlinkLabel: "Blink",
    panelSearchScopeHelp: "To avoid performance impact on dynamically generated or very large pages, Better Search Highlighter limits how much text it loads. Enable Search all content when you want to search the entire page.",
    panelSearchAllContent: "Search all content",
    panelSearchAllContentWarning: "Warning: this searches the page without content-size limits and may affect performance on some pages.",
    panelResetLevel: "Reset level",
    panelResetPanel: "Reset panel",
    panelOpenShortcuts: "Shortcuts",
    panelResetSettings: "Reset settings",
    statusTextSafetyLimit: "Search stopped at the page text safety limit.",
    statusNodeSafetyLimit: "Search stopped at the DOM node safety limit.",
    statusFrameSafetyLimit: "Search skipped some frames for safety.",
    statusMatchSafetyLimit: "Too many matches. Results were limited for performance.",
    statusSearchAllContentHint: "Enable Search all content to search without this limit.",
    shortcutUnassignedNotice: "Shortcut is not assigned. Set it in Chrome shortcuts.",
    statusLevelReset: "Highlight level reset.",
    statusPanelReset: "Panel position reset.",
    statusAllReset: "All settings reset.",
    statusOpenShortcutsManually: "Open chrome://extensions/shortcuts manually."
  }),
  ja: Object.freeze({
    extensionName: "Better Search Highlighter",
    panelSearchLabel: "検索語",
    panelPreviousMatch: "前の一致",
    panelNextMatch: "次の一致",
    panelJumpLabel: "一致番号へ移動",
    panelCloseSearch: "検索を閉じる",
    panelCloseButton: "×",
    panelSettingsSummary: "設定",
    panelLanguageLabel: "言語",
    panelLanguageAuto: "自動",
    panelLanguageEnglish: "英語",
    panelLanguageJapanese: "日本語",
    panelAllowBlinking: "点滅ハイライトを許可",
    panelBlinkLabel: "点滅",
    panelSearchScopeHelp: "動的に生成されたり非常に大規模なページでもパフォーマンスに影響を及ぼさないよう、読み込むテキストの量を制限しています。全てのコンテンツを検索したいときは「全てのコンテンツを検索」を有効にしてください。",
    panelSearchAllContent: "全てのコンテンツを検索",
    panelSearchAllContentWarning: "注意: 無制限にページ内を検索するため、一部のページではパフォーマンスに影響を及ぼす可能性があります。",
    panelResetLevel: "強調レベルをリセット",
    panelResetPanel: "パネル位置をリセット",
    panelOpenShortcuts: "ショートカット",
    panelResetSettings: "設定をリセット",
    statusTextSafetyLimit: "ページ本文の安全上限に達したため検索を停止しました。",
    statusNodeSafetyLimit: "DOM ノード数の安全上限に達したため検索を停止しました。",
    statusFrameSafetyLimit: "安全のため一部の frame を検索対象から外しました。",
    statusMatchSafetyLimit: "一致数が多すぎるため、結果を制限しました。",
    statusSearchAllContentHint: "この制限なしで検索するには「全てのコンテンツを検索」を有効にしてください。",
    shortcutUnassignedNotice: "ショートカットが未割り当てです。Chrome のショートカット設定で変更できます。",
    statusLevelReset: "強調レベルをリセットしました。",
    statusPanelReset: "パネル位置をリセットしました。",
    statusAllReset: "すべての設定をリセットしました。",
    statusOpenShortcutsManually: "chrome://extensions/shortcuts を手動で開いてください。"
  })
});

let languagePreference = "auto";

export function setLanguagePreference(value) {
  languagePreference = value === "en" || value === "ja" ? value : "auto";
}

export function t(key, substitutions, fallback = key) {
  const local = MESSAGES[effectiveLanguage()]?.[key];
  if (local) {
    return applySubstitutions(local, substitutions);
  }

  const api = globalThis.chrome?.i18n;
  const value = api?.getMessage?.(key, substitutions);
  return value || fallback;
}

export function productName() {
  return t("extensionName", undefined, PRODUCT_NAME_FALLBACK);
}

export function uiLanguage() {
  return effectiveLanguage();
}

function effectiveLanguage() {
  if (languagePreference === "en" || languagePreference === "ja") {
    return languagePreference;
  }
  return globalThis.chrome?.i18n?.getUILanguage?.().startsWith("ja") ? "ja" : "en";
}

function applySubstitutions(message, substitutions) {
  if (!Array.isArray(substitutions)) {
    return message;
  }

  return substitutions.reduce((result, value, index) => {
    return result.replaceAll(`$${index + 1}`, String(value));
  }, message);
}
