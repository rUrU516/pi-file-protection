import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerDeleteProtection } from "./delete-protection";
import { registerEditProtection } from "./edit-protection";
import { registerGitProtection } from "./git-protection";
import { registerPrivilegeProtection } from "./privilege-protection";
import { state } from "./constants";
import { osNotify } from "./os-notify";

// ANSI colors
const RESET = "\x1b[0m";
const RESET_FG = "\x1b[39m";
function rgbFg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}
function rgbBg(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

// Shield gradient: icy blue tones
const SHIELD_COLORS = [
  [56, 189, 248],   // sky-400
  [14, 165, 233],   // sky-500
  [2, 132, 199],    // sky-600
  [56, 189, 248],   // sky-400
  [125, 211, 252],  // sky-300
  [56, 189, 248],   // sky-400
];

// Fire gradient: warm red/orange/yellow tones
const FIRE_COLORS = [
  [239, 68, 68],    // red-500
  [249, 115, 22],   // orange-500
  [234, 179, 8],    // yellow-500
  [249, 115, 22],   // orange-500
  [239, 68, 68],    // red-500
  [220, 38, 38],    // red-600
];

const BLOCK = "▌";
const THIN_BLOCK = "▎";

function renderGradientBar(colors: number[][], width: number, text: string): string {
  let bar = "";
  // Left gradient blocks
  for (let i = 0; i < width; i++) {
    const t = width === 1 ? 0 : i / (width - 1);
    const colorIdx = Math.floor(t * (colors.length - 1));
    const nextIdx = Math.min(colorIdx + 1, colors.length - 1);
    const localT = (t * (colors.length - 1)) - colorIdx;
    const r = Math.round(colors[colorIdx][0] + (colors[nextIdx][0] - colors[colorIdx][0]) * localT);
    const g = Math.round(colors[colorIdx][1] + (colors[nextIdx][1] - colors[colorIdx][1]) * localT);
    const b = Math.round(colors[colorIdx][2] + (colors[nextIdx][2] - colors[colorIdx][2]) * localT);
    bar += `${rgbFg(r, g, b)}${BLOCK}`;
  }
  // Text in the middle color
  const midColor = colors[Math.floor(colors.length / 2)];
  bar += `${RESET_FG} ${rgbFg(midColor[0], midColor[1], midColor[2])}${text}${RESET_FG} `;
  // Right gradient blocks
  for (let i = 0; i < width; i++) {
    const t = width === 1 ? 0 : i / (width - 1);
    const colorIdx = Math.floor(t * (colors.length - 1));
    const nextIdx = Math.min(colorIdx + 1, colors.length - 1);
    const localT = (t * (colors.length - 1)) - colorIdx;
    const r = Math.round(colors[colorIdx][0] + (colors[nextIdx][0] - colors[colorIdx][0]) * localT);
    const g = Math.round(colors[colorIdx][1] + (colors[nextIdx][1] - colors[colorIdx][1]) * localT);
    const b = Math.round(colors[colorIdx][2] + (colors[nextIdx][2] - colors[colorIdx][2]) * localT);
    bar += `${rgbFg(r, g, b)}${BLOCK}`;
  }
  return bar + RESET;
}

let animInterval: ReturnType<typeof setInterval> | null = null;
let frameIndex = 0;

function startAnimation(ctx: { ui: { setWidget: (key: string, lines: string[]) => void } }) {
  stopAnimation();
  frameIndex = 0;

  const render = () => {
    const isOn = state.protectionEnabled;
    const colors = isOn ? SHIELD_COLORS : FIRE_COLORS;
    const label = isOn ? "[ PROTECT ON  ]" : "[ PROTECT OFF ]";

    // Animate by shifting color array
    const shifted = [...colors.slice(frameIndex % colors.length), ...colors.slice(0, frameIndex % colors.length)];

    const bar = renderGradientBar(shifted, 4, label);
    ctx.ui.setWidget("protection", [bar]);
    frameIndex++;
  };

  render();
  animInterval = setInterval(render, 150);
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
