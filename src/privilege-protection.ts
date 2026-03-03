import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

const CONFIRM_PATTERNS = [
  /\bsudo\b/i,                    // sudo commands (elevated privileges)
  /\b(chmod|chown)\b.*777/i,     // dangerous permissions (777 = full access for everyone)
]

export function registerPrivilegeProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {

    if (isToolCallEventType("bash", event)) {
      if (CONFIRM_PATTERNS.some(pattern => pattern.test(event.input.command))) {
        const ok = await ctx.ui.confirm("确定要执行该命令么？", `${event.input.command}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
      }
    }
  });

}
