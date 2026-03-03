import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { CONFIRM_MESSAGE } from "./constants";

const CONFIRM_PATTERNS = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bunlink\b/i,
]

export function registerDeleteProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {

    if (isToolCallEventType("bash", event)) {
      if (CONFIRM_PATTERNS.some(pattern => pattern.test(event.input.command))) {
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, event.input.command);
        if (!ok) return { block: true, reason: "Refused by the user." };
      }
    }
  });

}
