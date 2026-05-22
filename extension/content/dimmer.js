export class SpotlightDimmer {
  constructor(styleManager) {
    this.styleManager = styleManager;
    this.element = null;
    this.match = null;
    this.boundUpdate = () => this.updatePosition();
  }

  update(match, level) {
    if (level !== 4 || !match?.element?.isConnected) {
      this.clear();
      return;
    }

    if (this.match?.win !== match.win) {
      this.detachListeners();
    }

    this.match = match;
    this.styleManager.ensureDocument(match.doc);

    if (!this.element || this.element.ownerDocument !== match.doc) {
      this.clearElementOnly();
      this.element = match.doc.createElement("div");
      this.element.className = "bsh-dimmer";
      this.element.dataset.bshRoot = "true";
      this.element.setAttribute("aria-hidden", "true");
      match.doc.documentElement.appendChild(this.element);
    }

    this.attachListeners();
    this.updatePosition();
  }

  updatePosition() {
    if (!this.element || !this.match?.element?.isConnected) {
      this.clear();
      return;
    }

    const rect = this.match.element.getBoundingClientRect();
    const padding = 6;
    this.element.style.left = `${Math.max(0, rect.left - padding)}px`;
    this.element.style.top = `${Math.max(0, rect.top - padding)}px`;
    this.element.style.width = `${Math.max(1, rect.width + padding * 2)}px`;
    this.element.style.height = `${Math.max(1, rect.height + padding * 2)}px`;
  }

  clear() {
    this.detachListeners();
    this.clearElementOnly();
    this.match = null;
  }

  clearElementOnly() {
    this.element?.remove();
    this.element = null;
  }

  attachListeners() {
    const win = this.match?.win;
    if (!win || this.listenersAttached) {
      return;
    }
    win.addEventListener("scroll", this.boundUpdate, { passive: true });
    win.addEventListener("resize", this.boundUpdate, { passive: true });
    win.visualViewport?.addEventListener("scroll", this.boundUpdate, { passive: true });
    win.visualViewport?.addEventListener("resize", this.boundUpdate, { passive: true });
    this.listenersAttached = true;
  }

  detachListeners() {
    const win = this.match?.win;
    if (!win || !this.listenersAttached) {
      return;
    }
    win.removeEventListener("scroll", this.boundUpdate);
    win.removeEventListener("resize", this.boundUpdate);
    win.visualViewport?.removeEventListener("scroll", this.boundUpdate);
    win.visualViewport?.removeEventListener("resize", this.boundUpdate);
    this.listenersAttached = false;
  }
}
