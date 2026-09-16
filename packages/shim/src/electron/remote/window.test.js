import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

let windowShim;
let webFrame;

beforeAll(async () => {
  // window.js reads the viewport at import time.
  vi.stubGlobal("window", { innerWidth: 1200, innerHeight: 800 });
  vi.stubGlobal("document", { body: { style: {} } });
  ({ windowShim } = await import("./window.js"));
  ({ webFrame } = await import("../web-frame.js"));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("current window setFrameZoomLevel", () => {
  it("zooms the page like webFrame.setZoomLevel, which Obsidian 1.12 called directly", () => {
    const win = windowShim.getFocusedWindow();

    win.setFrameZoomLevel(1);

    expect(webFrame.getZoomLevel()).toBe(1);
    expect(document.body.style.zoom).toBeCloseTo(1.2);

    win.setFrameZoomLevel(0);

    expect(webFrame.getZoomLevel()).toBe(0);
  });
});

describe("current window setFrameZoomLevel limits", () => {
  it("clamps to Electron's -2.5..3 range, since Obsidian's zoom commands no longer check it", () => {
    const win = windowShim.getFocusedWindow();

    win.setFrameZoomLevel(3.5);
    expect(webFrame.getZoomLevel()).toBe(3);

    win.setFrameZoomLevel(-4);
    expect(webFrame.getZoomLevel()).toBe(-2.5);

    win.setFrameZoomLevel(0);
  });
});

describe("current window setMinimumSize", () => {
  it("accepts a minimum size without throwing", () => {
    const win = windowShim.getFocusedWindow();

    expect(() => win.setMinimumSize(600, 400)).not.toThrow();
  });
});
