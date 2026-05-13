import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { registerDeleteProtection } from "./delete-protection";
import { registerEditProtection } from "./edit-protection";
import { registerGitProtection } from "./git-protection";
import { registerPrivilegeProtection } from "./privilege-protection";
import { state } from "./constants";
import { osNotify } from "./os-notify";

// ANSI colors
const RESET = "\x1b[0m";
function rgbFg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

// Shield gradient: richer but restrained blue tones
const SHIELD_COLORS = [
  [30, 58, 138],    // blue-900
  [30, 64, 175],    // blue-800
  [29, 78, 216],    // blue-700
  [37, 99, 235],    // blue-600
  [59, 130, 246],   // blue-500
  [96, 165, 250],   // blue-400
  [59, 130, 246],   // blue-500
  [37, 99, 235],    // blue-600
  [29, 78, 216],    // blue-700
  [30, 64, 175],    // blue-800
];

// Fire gradient: richer but restrained red tones
const FIRE_COLORS = [
  [127, 29, 29],    // red-900
  [153, 27, 27],    // red-800
  [185, 28, 28],    // red-700
  [220, 38, 38],    // red-600
  [239, 68, 68],    // red-500
  [248, 113, 113],  // red-400
  [239, 68, 68],    // red-500
  [220, 38, 38],    // red-600
  [185, 28, 28],    // red-700
  [153, 27, 27],    // red-800
];

function renderStatusLabel(frame: number): string {
  const colors = state.protectionEnabled ? SHIELD_COLORS : FIRE_COLORS;
  const text = state.protectionEnabled ? "[ SHIELD ON  ]" : "[ SHIELD OFF ]";
  const color = colors[frame % colors.length];
  return `${rgbFg(color[0], color[1], color[2])}${text}${RESET}`;
}

let activeProtectionEditor: ProtectionEditor | undefined;

class ProtectionEditor extends CustomEditor {
  private animationTimer?: ReturnType<typeof setInterval>;
  private frame = 0;

  constructor(...args: any[]) {
    super(...args);
    this.animationTimer = setInterval(() => {
      this.frame++;
      this.tui.requestRender();
    }, 800);
  }

  refresh(): void {
    this.tui.requestRender();
  }

  dispose(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }
  }

  render(width: number): string[] {
    const lines = super.render(width);
    if (lines.length === 0) return lines;

    const label = ` ${renderStatusLabel(this.frame)} `;
    const labelWidth = visibleWidth(label);
    const first = 0;

    if (width > labelWidth + 4) {
      lines[first] = label + truncateToWidth(lines[first]!, width - labelWidth, "");
    }

    return lines;
  }
}

function installProtectionEditor(ctx: { ui: { setEditorComponent: (factory: unknown) => void; setWidget: (key: string, lines?: string[]) => void } }) {
  ctx.ui.setWidget("protection", undefined);
  ctx.ui.setEditorComponent((tui: unknown, theme: unknown, keybindings: unknown) => {
    activeProtectionEditor?.dispose();
    activeProtectionEditor = new ProtectionEditor(tui, theme, keybindings);
    return activeProtectionEditor;
  });
}

export default function (pi: ExtensionAPI) {

  registerDeleteProtection(pi);
  registerEditProtection(pi);
  registerGitProtection(pi);
  registerPrivilegeProtection(pi);

  pi.on("session_start", async (_event, ctx) => {
    installProtectionEditor(ctx);
  });

  pi.on("session_shutdown", async () => {
    activeProtectionEditor?.dispose();
    activeProtectionEditor = undefined;
  });

  pi.registerCommand("shield", {
    description: "Toggle file protection shield on/off",
    getArgumentCompletions(prefix: string) {
      return [{ value: "on", label: "on - Enable protection" }, { value: "off", label: "off - Disable protection" }]
        .filter((i) => i.value.startsWith(prefix));
    },
    handler: async (args, ctx) => {
      if (args === "on") {
        state.protectionEnabled = true;
        activeProtectionEditor?.refresh();
        ctx.ui.notify("🛡️ Protection enabled", "info");
      } else if (args === "off") {
        state.protectionEnabled = false;
        activeProtectionEditor?.refresh();
        ctx.ui.notify("⚠️ Protection disabled", "info");
      } else {
        const status = state.protectionEnabled ? "🛡️ ON" : "⚠️ OFF";
        ctx.ui.notify(`Shield is currently ${status}. Usage: /shield on | /shield off`, "info");
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
