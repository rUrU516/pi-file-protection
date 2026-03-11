import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { CONFIRM_MESSAGE } from "./constants";

const GIT_BLACKLIST_PATTERNS = [
  /\bgit\s+push\b/i,
  /\bgit\s+commit\b/i,
  /\bgit\s+pull\b/i,
  /\bgit\s+merge\b/i,
  /\bgit\s+rebase\b/i,
  /\bgit\s+reset\b/i,
  /\bgit\s+checkout\b/i,
  /\bgit\s+switch\b/i,
  /\bgit\s+cherry-pick\b/i,
  /\bgit\s+stash\b/i,
  /\bgit\s+branch\b/i,
  /\bgit\s+tag\b/i,
  /\bgit\s+fetch\b/i,
  /\bgit\s+clean\b/i,
  /\bgit\s+revert\b/i,
  /\bgit\s+restore\b/i,
  /\bgit\s+am\b/i,
  /\bgit\s+apply\b/i,
];

const GH_CONFIRM_PATTERN = /\bgh\b/i;

export function registerGitProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {

    if (isToolCallEventType("bash", event)) {
      const shouldConfirmGit = GIT_BLACKLIST_PATTERNS.some(pattern => pattern.test(event.input.command));
      const shouldConfirmGh = GH_CONFIRM_PATTERN.test(event.input.command);

      if (shouldConfirmGit || shouldConfirmGh) {
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, `${event.input.command}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
      }
    }
  });

}
