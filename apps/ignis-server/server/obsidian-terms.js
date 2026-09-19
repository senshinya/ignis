// Obsidian 1.13+ refuses to start unless its host confirms a terms statement (see the shim's obsidian-terms.js).
// The operator accepts it with OBSIDIAN_ACCEPT_TERMS=true; static/index-html.js stamps that on the page body for the shim to read.

const DOCS_URL =
  "https://github.com/senshinya/ignis/blob/main/apps/docs/src/content/docs/server/environment.md#obsidian-terms";

// True for Obsidian 1.13 and later, and for an unknown version, where the check may apply.
function requiresTermsAcceptance(version) {
  const match = /^(\d+)\.(\d+)\./.exec(version || "");

  if (!match || version === "0.0.0") {
    return true;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);

  return major > 1 || (major === 1 && minor >= 13);
}

function termsWarning(version, accepted) {
  if (accepted || !requiresTermsAcceptance(version)) {
    return null;
  }

  return (
    `Obsidian ${version || "(unknown version)"} will not start until its terms statement is accepted. ` +
    `Read it at ${DOCS_URL} and, if you agree, set OBSIDIAN_ACCEPT_TERMS=true.`
  );
}

module.exports = { requiresTermsAcceptance, termsWarning };
