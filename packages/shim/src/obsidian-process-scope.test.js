import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createObsidianProcess,
  installObsidianProcessScope,
} from "./obsidian-process-scope.js";

const base = {
  platform: "linux",
  versions: { electron: "28.2.3" },
  env: { LOG: "" },
};

function stubDom() {
  const scripts = [];
  const fakeWindow = { process: base };
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", {
    createElement: () => ({ textContent: "", remove: vi.fn() }),
    head: { appendChild: (el) => scripts.push(el.textContent) },
  });
  return { scripts, fakeWindow };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createObsidianProcess", () => {
  it("reports an empty platform so Obsidian takes its OS from the user agent", () => {
    expect(createObsidianProcess(base).platform).toBe("");
  });

  it("delegates everything else to the shim and leaves the shim's platform alone", () => {
    const scoped = createObsidianProcess(base);

    expect(scoped.versions.electron).toBe("28.2.3");
    expect(scoped.env).toBe(base.env);
    expect(base.platform).toBe("linux");
  });
});

describe("installObsidianProcessScope", () => {
  it("binds the bare process identifier to the scoped object for Obsidian's scripts", () => {
    const { scripts, fakeWindow } = stubDom();

    installObsidianProcessScope();

    expect(scripts).toEqual(["let process = window.__ignisObsidianProcess;"]);
    expect(fakeWindow.__ignisObsidianProcess.platform).toBe("");
    expect(fakeWindow.process).toBe(base);
  });

  it("points the binding back at window.process once Obsidian's scripts have run", () => {
    const { scripts, fakeWindow } = stubDom();

    installObsidianProcessScope();
    fakeWindow.__ignisOnObsidianLoaded();

    expect(scripts[1]).toBe("process = window.process;");
    expect(fakeWindow.__ignisObsidianProcess).toBeUndefined();
  });
});
