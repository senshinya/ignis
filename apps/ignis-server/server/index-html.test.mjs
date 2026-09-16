import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { stampBodyFlags } = require("./index-html.js");

describe("stampBodyFlags", () => {
  const html = '<html><body class="theme-dark">\n<div></div></body></html>';

  it("leaves the body untouched when no flag is set", () => {
    expect(stampBodyFlags(html, {})).toBe(html);
  });

  it("stamps each set flag as a data attribute on the body", () => {
    const out = stampBodyFlags(html, {
      demoMode: true,
      obsidianTermsAccepted: true,
    });

    expect(out).toContain(
      '<body class="theme-dark" data-demo-mode="true" data-obsidian-terms-accepted="true">',
    );
  });

  it("stamps only the flags that are set", () => {
    const out = stampBodyFlags(html, { obsidianTermsAccepted: true });

    expect(out).toContain(
      '<body class="theme-dark" data-obsidian-terms-accepted="true">',
    );
    expect(out).not.toContain("data-demo-mode");
  });
});
