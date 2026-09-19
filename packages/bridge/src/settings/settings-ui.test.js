import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("obsidian", () => ({
  Setting: class {},
  Notice: class {},
  setIcon: () => {},
}));

const { createTab } = await import("./settings-ui.js");

function fakeEl() {
  return {
    classes: new Set(),
    empty: vi.fn(),
    addClass(cls) {
      this.classes.add(cls);
    },
    removeClass(cls) {
      this.classes.delete(cls);
    },
  };
}

// Walks rendered items the way Obsidian 1.13 does when it tears a tab down.
function forEachRendered(items, fn) {
  for (let i = 0; i < items.length; i++) {
    fn(items[i]);
  }
}

// Mirrors the tab calls in Obsidian 1.13.7's settings modal openTab and closeActiveTab.
function fakeSettingModal() {
  const modal = {
    activeTab: null,

    openTab(tab) {
      const prev = modal.activeTab;

      if (prev) {
        prev.navEl.removeClass("is-active");
        forEachRendered(prev.renderedItems, () => {});
        prev.renderedItems = [];
        prev.hide();
      }

      modal.activeTab = tab;
      tab.navEl.addClass("is-active");
      tab.renderTab();
    },

    closeActiveTab() {
      const tab = modal.activeTab;

      tab.navEl.removeClass("is-active");
      forEachRendered(tab.renderedItems, () => {});
      tab.renderedItems = [];
      tab.hide();
      modal.activeTab = null;
    },
  };

  return modal;
}

function nativeTab() {
  return {
    navEl: fakeEl(),
    renderedItems: [],
    renderTab: vi.fn(),
    hide: vi.fn(),
  };
}

describe("createTab", () => {
  beforeEach(() => {
    globalThis.createDiv = () => fakeEl();
  });

  afterEach(() => {
    delete globalThis.createDiv;
  });

  function ignisTab(displayFn) {
    const tab = createTab("ignis-general", "General", displayFn, {}, "flame");
    tab.navEl = fakeEl();

    return tab;
  }

  it("renders its content when Obsidian 1.13 opens it", () => {
    const displayFn = vi.fn();
    const tab = ignisTab(displayFn);

    fakeSettingModal().openTab(tab);

    expect(displayFn).toHaveBeenCalledWith(tab.containerEl, {});
  });

  it("lets Obsidian 1.13 switch to another tab afterwards", () => {
    const modal = fakeSettingModal();
    const tab = ignisTab(vi.fn());
    const next = nativeTab();

    modal.openTab(tab);
    modal.openTab(next);

    expect(next.renderTab).toHaveBeenCalled();
    expect(tab.navEl.classes.has("is-active")).toBe(false);
    expect(tab.containerEl.empty).toHaveBeenCalled();
  });

  it("lets Obsidian 1.13 close the settings modal while it is open", () => {
    const modal = fakeSettingModal();
    const tab = ignisTab(vi.fn());

    modal.openTab(tab);
    modal.closeActiveTab();

    expect(modal.activeTab).toBe(null);
  });
});
