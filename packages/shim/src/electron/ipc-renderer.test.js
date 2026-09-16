import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcRenderer } from "./ipc-renderer.js";
import { registerUI } from "../ui-registry.js";
import {
  OBSIDIAN_TERMS_STATEMENT,
  _resetTermsNotice,
} from "./obsidian-terms.js";

function stubBody(dataset) {
  vi.stubGlobal("document", { body: { dataset } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ipcRenderer.sendSync policy", () => {
  it("allows every feature, as Obsidian does outside a managed install", () => {
    expect(ipcRenderer.sendSync("policy")).toEqual({
      plugins: true,
      themes: true,
      snippets: true,
      sync: true,
      publish: true,
      webViewer: true,
      devTools: true,
      insider: true,
    });
  });
});

describe("ipcRenderer.sendSync is-closing", () => {
  it("reports the window as closing so Obsidian flushes pending saves on unload", () => {
    expect(ipcRenderer.sendSync("is-closing")).toBe(true);
  });
});

describe("ipcRenderer.sendSync frame", () => {
  // With a hidden frame, Obsidian keeps room for window controls, and on macOS leaves the top-left corner empty for traffic lights.
  it("reports the native frame, since the browser draws the window", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(ipcRenderer.sendSync("frame")).toBe("native");
  });
});

describe("ipcRenderer.sendSync set-language", () => {
  it("is handled without an unhandled-channel warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(ipcRenderer.sendSync("set-language", "de")).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("ipcRenderer.sendSync terms", () => {
  let showMessageDialog;

  beforeEach(() => {
    _resetTermsNotice();
    showMessageDialog = vi.fn();
    registerUI({ showMessageDialog });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns Obsidian's statement when the operator accepted it", () => {
    stubBody({ obsidianTermsAccepted: "true" });

    expect(ipcRenderer.sendSync("terms")).toBe(OBSIDIAN_TERMS_STATEMENT);
    expect(showMessageDialog).not.toHaveBeenCalled();
  });

  it("returns nothing and explains how to accept when the operator has not", () => {
    stubBody({});

    expect(ipcRenderer.sendSync("terms")).toBeNull();
    expect(showMessageDialog).toHaveBeenCalledTimes(1);

    const [, message] = showMessageDialog.mock.calls[0];
    expect(message).toContain(OBSIDIAN_TERMS_STATEMENT);
    expect(message).toContain("OBSIDIAN_ACCEPT_TERMS=true");
  });

  it("explains only once per page load", () => {
    stubBody({ obsidianTermsAccepted: "false" });

    ipcRenderer.sendSync("terms");
    ipcRenderer.sendSync("terms");

    expect(showMessageDialog).toHaveBeenCalledTimes(1);
  });
});
