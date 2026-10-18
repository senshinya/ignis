import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({
  SettingTab: class {
    constructor(app, setting) {
      this.app = app;
      this.setting = setting;
    }
  },
  setIcon: () => {},
}));

const { SettingTab } = await import("obsidian");
const { IgnisSettingTab } = await import("./settings-ui.js");

describe("IgnisSettingTab", () => {
  it("uses Obsidian's native SettingTab lifecycle", () => {
    const app = { setting: {} };
    const tab = new IgnisSettingTab(
      app, "ignis-general", "General", "flame", () => [],
    );

    expect(tab).toBeInstanceOf(SettingTab);
    expect(tab.app).toBe(app);
    expect(tab.setting).toBe(app.setting);
    expect(tab.id).toBe("ignis-general");
  });

  it("provides fresh definitions to Obsidian with the active tab as context", () => {
    const definitions = [{ name: "General" }];
    const build = vi.fn(() => definitions);
    const tab = new IgnisSettingTab(
      { setting: {} }, "ignis-general", "General", "flame", build,
    );

    expect(tab.getSettingDefinitions()).toBe(definitions);
    expect(build).toHaveBeenCalledWith(tab);
    tab.getSettingDefinitions();
    expect(build).toHaveBeenCalledTimes(2);
  });
});
