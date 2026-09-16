import { showMessageDialog } from "../ui-registry.js";

// Obsidian 1.13+ asks its host, over the `terms` IPC channel, for this exact statement and closes if the answer differs.
// Ignis returns it only when the operator accepted it via OBSIDIAN_ACCEPT_TERMS, which the server stamps on the body.
export const OBSIDIAN_TERMS_STATEMENT =
  "I understand and agree that I am not allowed to distribute the Obsidian application, in any form, without explicit approval from the Obsidian team. I also understand that Obsidian is a registered trademark, and I cannot use it without explicit permission granted by the Obsidian team.";

const DOCS_URL =
  "https://github.com/senshinya/ignis/blob/main/apps/docs/src/content/docs/server/environment.md#obsidian-terms";

let noticeShown = false;

export function isObsidianTermsAccepted() {
  return (
    typeof document !== "undefined" &&
    !!document.body &&
    document.body.dataset.obsidianTermsAccepted === "true"
  );
}

// Obsidian stops loading after a refused `terms` answer, so explain why instead of leaving a blank page.
export function reportTermsNotAccepted() {
  if (noticeShown) {
    return;
  }

  noticeShown = true;

  showMessageDialog(
    "Obsidian terms not accepted",
    "This version of Obsidian only starts after its host confirms this statement:\n\n" +
      `"${OBSIDIAN_TERMS_STATEMENT}"\n\n` +
      "Ignis does not confirm it on your behalf. If you run this server and agree, " +
      "set OBSIDIAN_ACCEPT_TERMS=true in the server environment and restart it.\n\n" +
      DOCS_URL,
  );
}

export function _resetTermsNotice() {
  noticeShown = false;
}
