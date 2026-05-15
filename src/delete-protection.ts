import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { CONFIRM_MESSAGE, state } from "./constants";
import { osNotify } from "./os-notify";
import { confirmWithReason } from "./confirm-utils";

const CONFIRM_PATTERNS = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bunlink\b/i,
  /\bmv\b/i,
  /delete/i,
]

export function registerDeleteProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {
    if (!state.protectionEnabled) return;

    if (isToolCallEventType("bash", event)) {
      if (CONFIRM_PATTERNS.some(pattern => pattern.test(event.input.command))) {
        const detail = `📟 ${event.input.command}`;
        osNotify("π", detail);
        const result = await confirmWithReason(ctx, CONFIRM_MESSAGE, event.input.command);
        if (result) return result;
      }
    }
  });

}
