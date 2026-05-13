import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { CONFIRM_MESSAGE, state } from "./constants";
import { osNotify } from "./os-notify";

const CONFIRM_PATTERNS = [
  /\btruncate\b/i,   // e.g. truncate -s 0 filename.txt
  />\s*\S+/,   // e.g. echo "" > filename.txt
  />>\s*\S+/,   // cat data >> filename.txt
  /\bsed\b.*\s-i(\s|$)/i,   // sed -i '' 's/a/b/' filename.txt
]

export function registerEditProtection(pi: ExtensionAPI) {

  pi.on("tool_call", async (event, ctx) => {
    if (!state.protectionEnabled) return;

    if (isToolCallEventType("write", event)) {
        const detail = `✏️ write ${event.input.path}`;
        osNotify("π", detail);
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, `write ${event.input.path}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!state.protectionEnabled) return;

    if (isToolCallEventType("edit", event)) {
        const detail = `✏️ edit ${event.input.path}`;
        osNotify("π", detail);
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, `edit ${event.input.path}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!state.protectionEnabled) return;

    if (isToolCallEventType("bash", event)) {
      if (CONFIRM_PATTERNS.some(pattern => pattern.test(event.input.command))) {
        const detail = `📟 ${event.input.command}`;
        osNotify("π", detail);
        const ok = await ctx.ui.confirm(CONFIRM_MESSAGE, `${event.input.command}`);
        if (!ok) return { block: true, reason: "Refused by the user." };
      }
    }
  })

}
