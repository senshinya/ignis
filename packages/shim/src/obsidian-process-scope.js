// Obsidian 1.13 takes its OS (and with it Mod = Cmd, the macOS/Windows UI) from the bare `process` identifier,
// and only falls back to the user agent when process.platform is empty.
// Other code must keep seeing linux: Sync's creation-time handling reads window.process.platform, and the vault is on the server.
// A global lexical `process` binding shadows window.process for bare identifiers, so while Obsidian's scripts evaluate
// they see an empty platform and derive the OS from the browser, as Obsidian did before 1.13.
// Once they have run, the binding points back at window.process, so plugins see the shim unchanged.

export function createObsidianProcess(base) {
  return Object.create(base, { platform: { value: "", enumerable: true } });
}

// A lexical binding can only be declared or reassigned from a classic script at global scope.
function runGlobal(source) {
  const script = document.createElement("script");
  script.textContent = source;
  document.head.appendChild(script);
  script.remove();
}

// Must run after window.process is installed and before Obsidian's scripts are injected.
// index.html calls window.__ignisOnObsidianLoaded once its injected scripts have loaded.
export function installObsidianProcessScope() {
  window.__ignisObsidianProcess = createObsidianProcess(window.process);
  runGlobal("let process = window.__ignisObsidianProcess;");

  window.__ignisOnObsidianLoaded = () => {
    runGlobal("process = window.process;");
    delete window.__ignisObsidianProcess;
  };
}
