const CONTEXT_MENU_OPEN = "better-search-highlight-open";

const MESSAGE_TYPES = Object.freeze({
  OPEN_SHORTCUTS: "BSH_OPEN_SHORTCUTS",
  GET_COMMANDS: "BSH_GET_COMMANDS"
});

chrome.runtime.onInstalled.addListener(() => {
  resetContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  resetContextMenu();
});

chrome.action.onClicked.addListener((tab) => {
  void openSearchInTab(tab);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_OPEN) {
    void openSearchInTab(tab);
  }
});

resetContextMenu();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type === MESSAGE_TYPES.OPEN_SHORTCUTS) {
    chrome.tabs
      .create({ url: "chrome://extensions/shortcuts" })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message ?? error) }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.GET_COMMANDS) {
    chrome.commands
      .getAll()
      .then((commands) => sendResponse({ ok: true, commands }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message ?? error) }));
    return true;
  }

  return false;
});

// Keep this simple and close to the official Chrome contextMenus MV3 sample:
// create menu items directly from the service worker, without module imports.
function resetContextMenu() {
  chrome.contextMenus.removeAll(() => {
    createContextMenu({
      id: CONTEXT_MENU_OPEN,
      title: chrome.i18n.getMessage("commandOpenSearch") || "Open Better Search Highlighter",
      contexts: ["page", "selection"]
    });
  });
}

function createContextMenu(options) {
  chrome.contextMenus.create(options, () => {
    if (chrome.runtime.lastError) {
      console.warn(`Failed to create context menu: ${chrome.runtime.lastError.message}`);
    }
  });
}

async function openSearchInTab(tab) {
  if (!tab?.id || isRestrictedUrl(tab.url)) {
    await markTabUnavailable(tab?.id);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ["content/index.js"]
    });
    await clearBadge(tab.id);
  } catch (error) {
    console.warn(`Better Search Highlighter: failed to inject content script`, error);
    await markTabUnavailable(tab.id);
  }
}

function isRestrictedUrl(url) {
  if (!url) {
    return true;
  }

  return /^(chrome|chrome-extension|edge|about|devtools):/i.test(url);
}

async function markTabUnavailable(tabId) {
  if (!tabId) {
    return;
  }

  await chrome.action.setBadgeText({ tabId, text: "!" });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#d00000" });
}

async function clearBadge(tabId) {
  await chrome.action.setBadgeText({ tabId, text: "" });
}
