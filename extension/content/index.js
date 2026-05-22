(async () => {
  const globalKey = "__betterSearchHighlightApp";

  if (window[globalKey]) {
    window[globalKey].open();
    return;
  }

  const { createBetterSearchHighlightApp } = await import(
    chrome.runtime.getURL("content/app.js")
  );

  const app = await createBetterSearchHighlightApp();
  window[globalKey] = app;
  app.open();
})();
