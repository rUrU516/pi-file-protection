import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const CONFIRM_PATTERNS = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bunlink\b/i,
]

export function registerDeleteProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {

    if (event.toolName === "bash") {
      if (CONFIRM_PATTERNS.some(pattern => pattern.test(event.input.command))) {
        const ok = await ctx.ui.confirm("确定要执行该命令么？", event.input.command);
        if (!ok) return { block: true, reason: "Refused by user" };
      }
    }
  });

}
