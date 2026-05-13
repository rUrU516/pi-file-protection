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

// Shield gradient: restrained blue tones
const SHIELD_COLORS = [
  [29, 78, 216],    // blue-700
  [37, 99, 235],    // blue-600
  [59, 130, 246],   // blue-500
  [37, 99, 235],    // blue-600
  [30, 64, 175],    // blue-800
  [37, 99, 235],    // blue-600
];

// Fire gradient: restrained red tones
const FIRE_COLORS = [
  [153, 27, 27],    // red-800
  [185, 28, 28],    // red-700
  [220, 38, 38],    // red-600
  [239, 68, 68],    // red-500
  [220, 38, 38],    // red-600
  [185, 28, 28],    // red-700
];

function renderStatusLabel(colors: number[][], text: string): string {
  const midColor = colors[Math.floor(colors.length / 2)];
  return `${rgbFg(midColor[0], midColor[1], midColor[2])}${text}${RESET}`;
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

    const widget = renderStatusLabel(shifted, label);
    ctx.ui.setWidget("protection", [widget]);
    frameIndex++;
  };

  render();
  animInterval = setInterval(render, 100);
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
