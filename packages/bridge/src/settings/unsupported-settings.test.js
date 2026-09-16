import { describe, it, expect } from "vitest";
import {
  filterSettingDefinitions,
  guardUnsupportedSettings,
} from "./unsupported-settings.js";

// Shaped like Obsidian 1.13's minified render functions, which read the config key as a string literal.
function popoutToggle() {
  return {
    name: "Open settings in new window",
    render: function (n) {
      return n.setValue(t.vault.getConfig("settingsPopoutWindow"));
    },
  };
}

function zoomSlider() {
  return {
    name: "Zoom level",
    render: function (e) {
      return e.addSlider();
    },
  };
}

function interfaceDefinitions() {
  return [
    {
      name: "Show tab title bar",
      control: { type: "toggle", key: "showViewHeader" },
    },
    { type: "page", name: "Ribbon", items: [{ name: "Ribbon item" }] },
    {
      type: "group",
      heading: "Advanced",
      items: [zoomSlider(), popoutToggle()],
    },
  ];
}

function fakeApp(config = {}) {
  const tabs = [
    { id: "interface", getSettingDefinitions: interfaceDefinitions },
    { id: "hotkeys" },
  ];

  return {
    vault: { getConfig: (key) => config[key] },
    setting: { settingTabs: tabs },
  };
}

function names(defs) {
  return defs.flatMap((d) => [
    d.name || d.heading,
    ...(d.items ? names(d.items) : []),
  ]);
}

describe("filterSettingDefinitions", () => {
  it("drops items whose render reads a hidden key, inside groups too", () => {
    const out = filterSettingDefinitions(interfaceDefinitions(), [
      "settingsPopoutWindow",
    ]);

    expect(names(out)).toEqual([
      "Show tab title bar",
      "Ribbon",
      "Ribbon item",
      "Advanced",
      "Zoom level",
    ]);
  });

  it("drops declarative controls bound to a hidden key", () => {
    const out = filterSettingDefinitions(interfaceDefinitions(), [
      "showViewHeader",
    ]);

    expect(names(out)).not.toContain("Show tab title bar");
  });

  it("does not mutate the definitions it is given", () => {
    const defs = interfaceDefinitions();

    filterSettingDefinitions(defs, ["settingsPopoutWindow"]);

    expect(defs[2].items).toHaveLength(2);
  });
});

describe("guardUnsupportedSettings", () => {
  it("keeps settings modals in the page even when the vault asks for a window", () => {
    const app = fakeApp({ settingsPopoutWindow: true, theme: "dark" });

    guardUnsupportedSettings(app);

    expect(app.vault.getConfig("settingsPopoutWindow")).toBe(false);
    expect(app.vault.getConfig("theme")).toBe("dark");
  });

  it("hides the settings-window toggle from its tab", () => {
    const app = fakeApp();

    guardUnsupportedSettings(app);

    expect(names(app.setting.settingTabs[0].getSettingDefinitions())).toEqual([
      "Show tab title bar",
      "Ribbon",
      "Ribbon item",
      "Advanced",
      "Zoom level",
    ]);
  });

  // Obsidian caches definitions in settingItems via update(), and some tabs fill that cache at boot.
  it("refreshes definitions a tab already cached", () => {
    const app = fakeApp();
    const iface = app.setting.settingTabs[0];
    iface.update = function () {
      this.settingItems = this.getSettingDefinitions();
    };
    iface.update();

    const undo = guardUnsupportedSettings(app);

    expect(names(iface.settingItems)).not.toContain(
      "Open settings in new window",
    );

    undo();

    expect(names(iface.settingItems)).toContain("Open settings in new window");
  });

  it("restores the original behavior when undone", () => {
    const app = fakeApp({ settingsPopoutWindow: true });

    const undo = guardUnsupportedSettings(app);
    undo();

    expect(app.vault.getConfig("settingsPopoutWindow")).toBe(true);
    expect(names(app.setting.settingTabs[0].getSettingDefinitions())).toContain(
      "Open settings in new window",
    );
  });
});
