import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { CONFIRM_MESSAGE } from "./constants";

const CONFIRM_PATTERNS = [
  /\btruncate\b/i,   // e.g. truncate -s 0 filename.txt
  />\s*\S+/,   // e.g. echo "" > filename.txt
  />>\s*\S+/,   // cat data >> filename.txt
  /\bsed\b.*\s-i(\s|$)/i,   // sed -i '' 's/a/b/' filename.txt
]

export function registerEditProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {

    if (isToolCallEventType("write", event)) {
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, `write ${event.input.path}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
    }
  });

  pi.on("tool_call", async (event, ctx) => {

    if (isToolCallEventType("edit", event)) {
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, `edit ${event.input.path}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
    }
  });

  pi.on("tool_call", async (event, ctx) => {

    if (isToolCallEventType("bash", event)) {
      if (CONFIRM_PATTERNS.some(pattern => pattern.test(event.input.command))) {
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, `${event.input.command}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
      }
    }
  })

}




