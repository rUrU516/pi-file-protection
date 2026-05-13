import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
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

// Shield gradient: icy blue/cyan/violet tones
const SHIELD_COLORS = [
  [125, 211, 252],  // sky-300
  [56, 189, 248],   // sky-400
  [34, 211, 238],   // cyan-400
  [45, 212, 191],   // teal-400
  [14, 165, 233],   // sky-500
  [59, 130, 246],   // blue-500
  [99, 102, 241],   // indigo-500
  [139, 92, 246],   // violet-500
  [56, 189, 248],   // sky-400
];

// Fire gradient: warm red/orange/yellow/magenta tones
const FIRE_COLORS = [
  [220, 38, 38],    // red-600
  [239, 68, 68],    // red-500
  [249, 115, 22],   // orange-500
  [251, 146, 60],   // orange-400
  [234, 179, 8],    // yellow-500
  [250, 204, 21],   // yellow-400
  [249, 115, 22],   // orange-500
  [236, 72, 153],   // pink-500
  [220, 38, 38],    // red-600
];

function renderStatusLabel(colors: number[][], text: string, offset: number): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const color = colors[(i + offset) % colors.length];
    out += `${rgbFg(color[0], color[1], color[2])}${text[i]}`;
  }
  return out + RESET;
}

let animInterval: ReturnType<typeof setInterval> | null = null;
let frameIndex = 0;

function startAnimation(ctx: { ui: { setWidget: (key: string, lines: string[]) => void } }) {
  stopAnimation();
  frameIndex = 0;

  const render = () => {
    const isOn = state.protectionEnabled;
    const colors = isOn ? SHIELD_COLORS : FIRE_COLORS;
    const label = isOn ? "[ SHIELD ON  ]" : "[ SHIELD OFF ]";

    // Animate by shifting color array
    const shifted = [...colors.slice(frameIndex % colors.length), ...colors.slice(0, frameIndex % colors.length)];

    const widget = renderStatusLabel(shifted, label, frameIndex);
    ctx.ui.setWidget("protection", [widget]);
    frameIndex++;
  };

  render();
  animInterval = setInterval(render, 80);
}

function stopAnimation() {
  if (animInterval !== null) {
    clearInterval(animInterval);
    animInterval = null;
  }
}

export default function (pi: ExtensionAPI) {

  registerDeleteProtection(pi);
  registerEditProtection(pi);
  registerGitProtection(pi);
  registerPrivilegeProtection(pi);

  pi.on("session_start", async (_event, ctx) => {
    startAnimation(ctx);
  });

  pi.on("session_shutdown", async () => {
    stopAnimation();
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
        startAnimation(ctx);
        ctx.ui.notify("🛡️ Protection enabled", "info");
      } else if (args === "off") {
        state.protectionEnabled = false;
        startAnimation(ctx);
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
