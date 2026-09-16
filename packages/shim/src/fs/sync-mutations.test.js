import { describe, it, expect, vi, afterEach } from "vitest";
import { createFsSync } from "./sync.js";
import { resolvePath, registerPathResolver, _reset } from "./transforms.js";
import { isRecentLocalOp } from "./echo-guard.js";
import * as wd from "./write-durability.js";
import * as coalescer from "./write-coalescer.js";

function makeDeps() {
  const store = new Map();

  const metadataCache = {
    has: (p) => store.has(p),
    get: (p) => (store.has(p) ? store.get(p) : null),
    set: (p, m) => store.set(p, m),
    delete: (p) => store.delete(p),
    rename: (a, b) => {
      if (store.has(a)) {
        store.set(b, store.get(a));
        store.delete(a);
      }
    },
    toStat: (p) =>
      store.has(p)
        ? {
            type: store.get(p).type,
            isDirectory: () => store.get(p).type === "directory",
            isFile: () => store.get(p).type === "file",
          }
        : null,
    readdir: () => [],
  };

  const contentCache = {
    get: () => null,
    set: vi.fn(),
    delete: vi.fn(),
    invalidate: vi.fn(),
  };

  const transport = {
    mkdir: vi.fn(async () => {}),
    rmdir: vi.fn(async () => {}),
    rm: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
    copyFile: vi.fn(async () => {}),
    appendFile: vi.fn(async () => {}),
    utimes: vi.fn(async () => {}),
    stat: vi.fn(async () => ({ type: "file", size: 1 })),
    readFileSync: vi.fn(() => {
      throw new Error("transport.readFileSync should not be called");
    }),
  };

  return { metadataCache, contentCache, transport, store };
}

describe("sync fs mutations", () => {
  it("lstatSync mirrors statSync", () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    deps.store.set(resolvePath("dir"), { type: "directory" });

    expect(fs.lstatSync("dir").isDirectory()).toBe(true);
  });

  it("mkdirSync updates the cache and fires the transport", () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );

    fs.mkdirSync("newdir", { recursive: true });

    expect(deps.store.get("newdir")).toEqual({ type: "directory" });
    expect(deps.transport.mkdir).toHaveBeenCalledWith("newdir", true);
  });

  it("rmSync deletes from the cache and fires the transport", async () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    const key = resolvePath("gone.md");
    deps.store.set(key, { type: "file" });

    fs.rmSync("gone.md", { recursive: true });

    expect(deps.store.has(key)).toBe(false);
    await Promise.resolve();
    expect(deps.transport.rm).toHaveBeenCalled();
  });

  it("renameSync moves cache metadata and fires the transport", () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    const from = resolvePath("a.md");
    const to = resolvePath("b.md");
    deps.store.set(from, { type: "file", size: 2 });

    fs.renameSync("a.md", "b.md");

    expect(deps.store.has(from)).toBe(false);
    expect(deps.store.get(to)).toEqual({ type: "file", size: 2 });
    expect(deps.transport.rename).toHaveBeenCalled();
  });

  it("copyFileSync optimistically mirrors source metadata and fires the transport", () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    const srcKey = resolvePath("src.md");
    const destKey = resolvePath("dest.md");
    deps.store.set(srcKey, { type: "file", size: 9 });

    fs.copyFileSync("src.md", "dest.md");

    expect(deps.store.get(destKey)).toEqual({ type: "file", size: 9 });
    expect(deps.transport.copyFile).toHaveBeenCalled();
  });

  it("utimesSync sets mtime and fires the transport", () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    const key = resolvePath("note.md");
    deps.store.set(key, { type: "file", mtime: 0 });

    fs.utimesSync("note.md", 111, 222);

    expect(deps.store.get(key).mtime).toBe(222000);
    expect(deps.transport.utimes).toHaveBeenCalledWith(key, 111000, 222000);
  });

  it("utimesSync converts a Date argument to milliseconds", () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    const key = resolvePath("note.md");
    deps.store.set(key, { type: "file", mtime: 0 });

    const when = new Date(1783339200000);
    fs.utimesSync("note.md", when, when);

    expect(deps.store.get(key).mtime).toBe(1783339200000);
    expect(deps.transport.utimes).toHaveBeenCalledWith(
      key,
      1783339200000,
      1783339200000,
    );
  });
});

describe("directory mutations honor path resolvers", () => {
  afterEach(() => _reset());

  it("mkdirSync uses the resolved path for cache, echo-guard, and transport", () => {
    registerPathResolver(
      (p) => p === "logical/dir",
      () => "physical/dir",
    );

    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );

    fs.mkdirSync("logical/dir", { recursive: true });

    expect(deps.store.get("physical/dir")).toEqual({ type: "directory" });
    expect(deps.store.has("logical/dir")).toBe(false);
    expect(deps.transport.mkdir).toHaveBeenCalledWith("physical/dir", true);
    expect(isRecentLocalOp("physical/dir")).toBe(true);
    expect(isRecentLocalOp("logical/dir")).toBe(false);
  });

  it("rmdirSync uses the resolved path for cache, echo-guard, and transport", () => {
    registerPathResolver(
      (p) => p === "logical/dir",
      () => "physical/dir",
    );

    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    deps.store.set("physical/dir", { type: "directory" });

    fs.rmdirSync("logical/dir");

    expect(deps.store.has("physical/dir")).toBe(false);
    expect(deps.transport.rmdir).toHaveBeenCalledWith("physical/dir");
    expect(isRecentLocalOp("physical/dir")).toBe(true);
  });
});

describe("readFileSync existence", () => {
  afterEach(() => _reset());

  it("answers ENOENT from the cache for a missing non-redirected path, no transport", () => {
    const deps = makeDeps();
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );

    // Leading slash: normalize strips it, so resolved !== the raw argument.
    expect(() => fs.readFileSync("/.obsidian/backlink.json", "utf8")).toThrow(
      /ENOENT/,
    );
    expect(deps.transport.readFileSync).not.toHaveBeenCalled();
  });

  it("falls back to the original path for a redirected miss", () => {
    registerPathResolver(
      (p) => p === ".obsidian/workspace.json",
      () => ".obsidian/workspace.Work.json",
    );

    const deps = makeDeps();
    deps.transport.readFileSync = vi.fn((p) => {
      if (p === ".obsidian/workspace.Work.json") {
        const e = new Error("ENOENT");
        e.code = "ENOENT";
        throw e;
      }

      return "BASE";
    });

    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );

    // Returns the base content after the redirect target 404s: the fallback fired.
    expect(fs.readFileSync("/.obsidian/workspace.json", "utf8")).toBe("BASE");
    expect(deps.transport.readFileSync).toHaveBeenCalledWith(
      ".obsidian/workspace.Work.json",
      "utf8",
    );
  });
});

describe("sync mutations on the same path reach the server in call order", () => {
  function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  function setup() {
    const deps = makeDeps();
    deps.transport.writeFile = vi.fn();
    deps.transport.unlink = vi.fn(async () => {});
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    return { deps, fs };
  }

  afterEach(() => {
    wd._reset();
  });

  // Obsidian's case-sensitivity probe on macOS: write a file, then delete it right away.
  it("sends an unlink only after the earlier write settles", async () => {
    const { deps, fs } = setup();
    const write = deferred();
    deps.transport.writeFile.mockReturnValue(write.promise);

    fs.writeFileSync(".OBSIDIANTEST", "", "utf8");
    fs.unlinkSync(".OBSIDIANTEST");
    await Promise.resolve();

    expect(fs.existsSync(".OBSIDIANTEST")).toBe(false);
    expect(deps.transport.unlink).not.toHaveBeenCalled();

    write.resolve({ mtime: 1, size: 0 });

    await vi.waitFor(() =>
      expect(deps.transport.unlink).toHaveBeenCalledWith(".OBSIDIANTEST"),
    );
  });

  it("still sends the unlink when the earlier write fails", async () => {
    const { deps, fs } = setup();
    const write = deferred();
    deps.transport.writeFile.mockReturnValue(write.promise);

    fs.writeFileSync("a.md", "x", "utf8");
    fs.unlinkSync("a.md");
    write.reject(new Error("offline"));

    await vi.waitFor(() =>
      expect(deps.transport.unlink).toHaveBeenCalledWith("a.md"),
    );
  });

  it("sends a write only after an earlier unlink settles", async () => {
    const { deps, fs } = setup();
    const unlink = deferred();
    deps.transport.unlink.mockReturnValue(unlink.promise);
    deps.transport.writeFile.mockResolvedValue({ mtime: 1, size: 1 });

    fs.unlinkSync("b.md");
    fs.writeFileSync("b.md", "new", "utf8");
    await Promise.resolve();

    expect(deps.transport.writeFile).not.toHaveBeenCalled();

    unlink.resolve();

    await vi.waitFor(() =>
      expect(deps.transport.writeFile).toHaveBeenCalledWith(
        "b.md",
        "new",
        "utf8",
      ),
    );
  });

  it("waits for a write queued through the async API on the same path", async () => {
    const { deps, fs } = setup();
    const write = deferred();
    coalescer.enqueue("e.md", () => write.promise);

    fs.unlinkSync("e.md");
    await Promise.resolve();

    expect(deps.transport.unlink).not.toHaveBeenCalled();

    write.resolve();

    await vi.waitFor(() =>
      expect(deps.transport.unlink).toHaveBeenCalledWith("e.md"),
    );
  });

  it("does not hold requests for paths with nothing pending", async () => {
    const { deps, fs } = setup();
    deps.transport.writeFile.mockReturnValue(new Promise(() => {}));

    fs.writeFileSync("c.md", "x", "utf8");
    fs.unlinkSync("d.md");
    await Promise.resolve();

    expect(deps.transport.writeFile).toHaveBeenCalledTimes(1);
    expect(deps.transport.unlink).toHaveBeenCalledWith("d.md");
  });
});

describe("unlinking a path drops writes still pending for it", () => {
  afterEach(() => {
    wd._reset();
    vi.useRealTimers();
  });

  function setup() {
    const deps = makeDeps();
    deps.transport.unlink = vi.fn(async () => {});
    const fs = createFsSync(
      deps.metadataCache,
      deps.contentCache,
      deps.transport,
    );
    return { deps, fs };
  }

  it("does not retry a failed write once the path is unlinked", async () => {
    vi.useFakeTimers();
    const { deps, fs } = setup();
    deps.transport.writeFile = vi.fn().mockRejectedValue(new Error("offline"));
    wd.initWriteDurability(deps.transport, coalescer.enqueue);

    fs.writeFileSync("f.md", "x", "utf8");
    await vi.advanceTimersByTimeAsync(0);
    fs.unlinkSync("f.md");
    await vi.advanceTimersByTimeAsync(60000);

    expect(deps.transport.writeFile).toHaveBeenCalledTimes(1);
    expect(deps.transport.unlink).toHaveBeenCalledWith("f.md");
  });

  it("does not flush a buffered boot write once the path is unlinked", async () => {
    vi.useFakeTimers();
    const { deps, fs } = setup();
    deps.transport.writeFile = vi.fn(async () => ({ mtime: 1, size: 1 }));
    coalescer.initWriteCoalescer(deps.transport);

    coalescer.bufferWrite("g.md", "x", "utf8", null);
    fs.unlinkSync("g.md");
    await vi.advanceTimersByTimeAsync(5000);

    expect(deps.transport.writeFile).not.toHaveBeenCalled();
    expect(deps.transport.unlink).toHaveBeenCalledWith("g.md");
  });
});
