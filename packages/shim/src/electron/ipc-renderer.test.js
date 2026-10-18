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
    vi.stubGlobal("window", { __obsidianTerms: OBSIDIAN_TERMS_STATEMENT });

    expect(ipcRenderer.sendSync("terms")).toBe(OBSIDIAN_TERMS_STATEMENT);
    expect(showMessageDialog).not.toHaveBeenCalled();
  });

  it("returns the statement extracted from the served Obsidian version", () => {
    stubBody({ obsidianTermsAccepted: "true" });
    vi.stubGlobal("window", { __obsidianTerms: "Updated Obsidian terms" });

    expect(ipcRenderer.sendSync("terms")).toBe("Updated Obsidian terms");
  });

  it("reports a missing extracted statement even after acceptance", () => {
    stubBody({ obsidianTermsAccepted: "true" });
    vi.stubGlobal("window", {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(ipcRenderer.sendSync("terms")).toBeNull();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("OBSIDIAN_TERMS_STRING"),
    );
  });

  it("shows the served statement while waiting for operator acceptance", () => {
    stubBody({});
    vi.stubGlobal("window", { __obsidianTerms: "Updated Obsidian terms" });

    expect(ipcRenderer.sendSync("terms")).toBeNull();
    expect(showMessageDialog.mock.calls[0][1]).toContain("Updated Obsidian terms");
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

describe("request-url IPC", () => {
  let proxied;

  beforeEach(() => {
    proxied = [];

    vi.stubGlobal("window", {
      location: { origin: "https://ignis.test" },
      __originalFetch: async (url, opts) => {
        proxied.push(JSON.parse(opts.body));

        return {
          ok: true,
          json: async () => ({ status: 200, headers: {}, body: "" }),
        };
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function requestUrl(request) {
    return new Promise((resolve) => {
      ipcRenderer.once("req-1", (event, reply) => resolve(reply));
      ipcRenderer.send("request-url", "req-1", request);
    });
  }

  describe("a requestUrl call through IPC", () => {
    it("sends its contentType as a Content-Type header", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      await requestUrl({
        url: "https://api.example.test/annotations",
        method: "POST",
        contentType: "application/json",
        body: "{}",
      });

      expect(proxied[0].headers).toEqual({ "Content-Type": "application/json" });
    });
  });

  describe("the request-url log line", () => {
    it("names the channel without the request's headers or body", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      await requestUrl({
        url: "https://api.example.test/login",
        method: "POST",
        headers: { Authorization: "Bearer SECRET" },
        body: '{"password":"SECRET"}',
      });

      expect(log).toHaveBeenCalledWith("[shim:ipcRenderer] send:", "request-url");
      expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET");
    });
  });

});
