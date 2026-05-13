import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerDeleteProtection } from "./delete-protection";
import { registerEditProtection } from "./edit-protection";
import { registerGitProtection } from "./git-protection";
import { registerPrivilegeProtection } from "./privilege-protection";
import { state } from "./constants";
import { osNotify } from "./os-notify";

function updateStatus(ctx: { ui: { setWidget: (key: string, lines: string[]) => void } }) {
  const icon = state.protectionEnabled ? "🛡️" : "🔥";
  ctx.ui.setWidget("protection", [icon]);
}

export default function (pi: ExtensionAPI) {

  registerDeleteProtection(pi);
  registerEditProtection(pi);
  registerGitProtection(pi);
  registerPrivilegeProtection(pi);

  pi.on("session_start", async (_event, ctx) => {
    updateStatus(ctx);
  });

  pi.registerCommand("protect", {
    description: "Toggle file protection on/off",
    getArgumentCompletions(prefix: string) {
      return [{ value: "on", label: "on - Enable protection" }, { value: "off", label: "off - Disable protection" }]
        .filter((i) => i.value.startsWith(prefix));
    },
    handler: async (args, ctx) => {
      if (args === "on") {
        state.protectionEnabled = true;
        updateStatus(ctx);
        ctx.ui.notify("🛡️ Protection enabled", "info");
      } else if (args === "off") {
        state.protectionEnabled = false;
        updateStatus(ctx);
        ctx.ui.notify("⚠️ Protection disabled", "info");
      } else {
        const status = state.protectionEnabled ? "🛡️ ON" : "⚠️ OFF";
        ctx.ui.notify(`Protection is currently ${status}. Usage: /protect on | /protect off`, "info");
      }
    },
  });

  pi.on("agent_end", async (event, _ctx) => {
    const MAX_LENGTH = 100;
    let summary = "";

    // Find the last assistant message
    for (let i = event.messages.length - 1; i >= 0; i--) {
      const msg = event.messages[i];
      if (msg.role === "assistant" && msg.content) {
        for (const block of Array.isArray(msg.content) ? msg.content : [{ type: "text", text: msg.content }]) {
          if (block.type === "text" && block.text) {
            summary = block.text;
            break;
          }
        }
        if (summary) break;
      }
    }

    if (summary.length > MAX_LENGTH) {
      summary = summary.slice(0, MAX_LENGTH) + "…";
    }

    osNotify("π", summary || "⚠️ No response text");
  });

}
