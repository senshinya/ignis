import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  requiresTermsAcceptance,
  termsWarning,
} = require("./obsidian-terms.js");

describe("requiresTermsAcceptance", () => {
  it("is false before Obsidian 1.13, which has no terms check", () => {
    expect(requiresTermsAcceptance("1.12.7")).toBe(false);
    expect(requiresTermsAcceptance("0.15.9")).toBe(false);
  });

  it("is true from Obsidian 1.13 on", () => {
    expect(requiresTermsAcceptance("1.13.0")).toBe(true);
    expect(requiresTermsAcceptance("1.13.7")).toBe(true);
    expect(requiresTermsAcceptance("1.14.2")).toBe(true);
    expect(requiresTermsAcceptance("2.0.0")).toBe(true);
  });

  it("is true when the version is unknown", () => {
    expect(requiresTermsAcceptance("0.0.0")).toBe(true);
    expect(requiresTermsAcceptance(null)).toBe(true);
    expect(requiresTermsAcceptance("nightly")).toBe(true);
  });
});

describe("termsWarning", () => {
  it("names the variable to set when a 1.13+ build is not accepted", () => {
    expect(termsWarning("1.13.7", false)).toContain(
      "OBSIDIAN_ACCEPT_TERMS=true",
    );
  });

  it("is null once accepted, or for versions without the check", () => {
    expect(termsWarning("1.13.7", true)).toBeNull();
    expect(termsWarning("1.12.7", false)).toBeNull();
  });
});
