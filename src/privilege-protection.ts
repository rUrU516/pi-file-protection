import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { CONFIRM_MESSAGE, state } from "./constants";
import { osNotify } from "./os-notify";
import { confirmWithReason } from "./confirm-utils";

const CONFIRM_PATTERNS = [
  /\bsudo\b/i,                    // sudo commands (elevated privileges)
  /\b(chmod|chown)\b.*777/i,     // dangerous permissions (777 = full access for everyone)
]

export function registerPrivilegeProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {
    if (!state.protectionEnabled) return;

    if (isToolCallEventType("bash", event)) {
      if (CONFIRM_PATTERNS.some(pattern => pattern.test(event.input.command))) {
        const detail = `📟 ${event.input.command}`;
        osNotify("π", detail);
        const result = await confirmWithReason(ctx, CONFIRM_MESSAGE, `${event.input.command}`);
        if (result) return result;
      }
    }
  });

}
